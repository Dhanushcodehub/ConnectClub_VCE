import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Connect Club | Vardhaman College of Engineering',
    short_name: 'Connect Club',
    description: 'Student-led technology community at Vardhaman College of Engineering',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
