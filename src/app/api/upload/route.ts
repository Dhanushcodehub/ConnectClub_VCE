import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let base64File: string | null = null;
    let type = 'image';

    if (contentType.includes("application/json")) {
      const json = await request.json();
      base64File = json.file; // should be a data URI
      type = json.type || 'image';
      if (!base64File) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      type = formData.get('type') as string || 'auto';

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    const uploadResult = await new Promise((resolve, reject) => {
      // If we have a base64 string (data URI), we can just use upload() directly
      if (base64File) {
        cloudinary.uploader.upload(base64File, {
          folder: 'connect-club-gallery',
          resource_type: type === 'video' ? 'video' : 'image',
        }, (error, result) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            return reject(error);
          }
          resolve(result);
        });
      } 
      // Otherwise, use upload_stream for buffer
      else if (fileBuffer) {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'connect-club-gallery',
            resource_type: type === 'video' ? 'video' : 'image',
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary Upload Error:", error);
              return reject(error);
            }
            resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      }
    });

    return NextResponse.json(uploadResult);
  } catch (error: any) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
