import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireStaffRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
// Exclude SVG to prevent stored XSS when rendered/opened directly.
const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const ALLOWED_VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime", "video/ogg"]);
const DATA_URI_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/i;
const DATA_URI_VIDEO_RE = /^data:video\/(mp4|webm|quicktime|ogg);base64,[A-Za-z0-9+/=]+$/i;

export const runtime = "nodejs";

function hasValidMagicBytes(buf: Buffer, mime: string): boolean {
  if (buf.length < 12) return false;
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === "image/png") {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === "image/gif") {
    const hdr = buf.subarray(0, 6).toString("ascii");
    return hdr === "GIF87a" || hdr === "GIF89a";
  }
  if (mime === "image/webp") {
    return (
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mime === "image/avif") {
    return buf.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (mime === "video/mp4" || mime === "video/quicktime") {
    return buf.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (mime === "video/webm") {
    return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  }
  if (mime === "video/ogg") {
    return buf.subarray(0, 4).toString("ascii") === "OggS";
  }
  return false;
}

export async function POST(request: Request) {
  let staffToken;
  try {
    staffToken = await requireStaffRequest(request);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit({
    namespace: "media:upload",
    identifier: `${staffToken.uid}:${getClientIp(request)}`,
    limit: 25,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl);
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let base64File: string | null = null;
    let type = "image";

    if (contentType.includes("application/json")) {
      const json = await request.json().catch(() => null);
      if (!json || typeof json !== "object") {
        return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
      }
      base64File = typeof json.file === "string" ? json.file.trim() : "";
      type = typeof json.type === "string" ? json.type : "image";

      if (!base64File) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (base64File.length > MAX_BYTES * 1.4) {
        return NextResponse.json({ error: "File is too large (max 10MB)." }, { status: 413 });
      }

      // Strictly require a base64 image/video data URI; reject http(s)/ftp/s3 URLs to block SSRF.
      const validDataUri =
        type === "video"
          ? DATA_URI_VIDEO_RE.test(base64File)
          : DATA_URI_IMAGE_RE.test(base64File);
      if (!validDataUri) {
        return NextResponse.json(
          { error: "Only base64-encoded raster images (JPEG, PNG, WebP, GIF, AVIF) or supported videos are allowed." },
          { status: 415 }
        );
      }
    } else {
      const formData = await request.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
      }

      const fileEntry = formData.get("file");
      if (!(fileEntry instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const rawType = formData.get("type");
      type = typeof rawType === "string" ? rawType : "auto";

      if (fileEntry.size === 0) {
        return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
      }
      if (fileEntry.size > MAX_BYTES) {
        return NextResponse.json({ error: "File is too large (max 10MB)." }, { status: 413 });
      }

      const isImage = ALLOWED_IMAGE.has(fileEntry.type);
      const isVideo = ALLOWED_VIDEO.has(fileEntry.type);
      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: "Unsupported file type." },
          { status: 415 }
        );
      }

      const arrayBuffer = await fileEntry.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      if (!hasValidMagicBytes(fileBuffer, fileEntry.type)) {
        return NextResponse.json(
          { error: "File contents do not match declared media type." },
          { status: 415 }
        );
      }
    }

    const resourceType = type === "video" ? "video" : "image";

    const uploadResult = await new Promise((resolve, reject) => {
      if (base64File) {
        cloudinary.uploader.upload(
          base64File,
          {
            folder: "connect-club-gallery",
            resource_type: resourceType,
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary Upload Error:", error);
              return reject(new Error("Upload provider error"));
            }
            resolve(result);
          }
        );
      } else if (fileBuffer) {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "connect-club-gallery",
            resource_type: resourceType,
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary Upload Error:", error);
              return reject(new Error("Upload provider error"));
            }
            resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      } else {
        reject(new Error("No file payload"));
      }
    });

    return NextResponse.json(uploadResult);
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Error in upload API:", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
