import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireStaffRequest, authErrorResponse } from '@/lib/firebase/requestAuth';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary will reject over-large payloads anyway; failing fast with a clear
// message avoids burning bandwidth and makes the abuse limit explicit.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Staff only (admin + member). Every caller is a portal page that has a
    // signed-in Firebase user; without this check the endpoint was an open
    // Cloudinary upload proxy for anonymous visitors.
    await requireStaffRequest(request);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let fileBuffer: Buffer | null = null;
    let base64File: string | null = null;
    let type = 'image';

    if (contentType.includes('application/json')) {
      const json = await request.json();
      base64File = json.file; // should be a data URI
      type = json.type || 'image';
      if (!base64File) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      if (typeof base64File !== 'string' || base64File.length > MAX_BYTES * 1.4) {
        return NextResponse.json({ error: 'File is too large (max 10MB).' }, { status: 413 });
      }
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      type = (formData.get('type') as string) || 'auto';

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File is too large (max 10MB).' }, { status: 413 });
      }

      const isImage = ALLOWED_IMAGE.includes(file.type);
      const isVideo = ALLOWED_VIDEO.includes(file.type);
      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type || 'unknown'}.` },
          { status: 415 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    const resourceType = type === 'video' ? 'video' : 'image';

    const uploadResult = await new Promise((resolve, reject) => {
      // If we have a base64 string (data URI), we can just use upload() directly
      if (base64File) {
        cloudinary.uploader.upload(
          base64File,
          {
            folder: 'connect-club-gallery',
            resource_type: resourceType,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary Upload Error:', error);
              return reject(error);
            }
            resolve(result);
          }
        );
      }
      // Otherwise, use upload_stream for buffer
      else if (fileBuffer) {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'connect-club-gallery',
            resource_type: resourceType,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary Upload Error:', error);
              return reject(error);
            }
            resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      } else {
        reject(new Error('No file payload'));
      }
    });

    return NextResponse.json(uploadResult);
  } catch (error: any) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message },
      { status: 500 }
    );
  }
}
