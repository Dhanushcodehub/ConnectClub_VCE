export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`]
  
  // If the image is already coming from cloudinary, don't double fetch it.
  if (src.startsWith('https://res.cloudinary.com')) {
    return src;
  }

  // Use the Cloudinary fetch API to pull and optimize the remote image
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'lnmhsw8u';
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${params.join(',')}/${src}`
}
