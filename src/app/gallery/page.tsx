import { Metadata } from 'next';
import GalleryClient from './GalleryClient';

export const metadata: Metadata = {
  title: 'Gallery | Connect Club VCE',
  description: 'Explore photos and memories from Connect Club events, workshops, and community activities at Vardhaman College of Engineering.',
  openGraph: {
    title: 'Gallery | Connect Club VCE',
    description: 'Explore photos and memories from Connect Club events, workshops, and community activities at Vardhaman College of Engineering.',
    url: 'https://connectclub-vce.vercel.app/gallery',
    siteName: 'Connect Club VCE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gallery | Connect Club VCE',
    description: 'Explore photos and memories from Connect Club events, workshops, and community activities at Vardhaman College of Engineering.',
  },
};

export default function GalleryPage() {
  return <GalleryClient />;
}
