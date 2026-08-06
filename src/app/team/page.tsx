import { Metadata } from 'next';
import TeamClient from './TeamClient';

export const metadata: Metadata = {
  title: 'Our Team | Connect Club VCE',
  description: 'Meet the passionate team behind Connect Club — student leaders driving innovation at Vardhaman College of Engineering.',
  openGraph: {
    title: 'Our Team | Connect Club VCE',
    description: 'Meet the passionate team behind Connect Club — student leaders driving innovation at Vardhaman College of Engineering.',
    url: 'https://connectclub-vce.vercel.app/team',
    siteName: 'Connect Club VCE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Our Team | Connect Club VCE',
    description: 'Meet the passionate team behind Connect Club — student leaders driving innovation at Vardhaman College of Engineering.',
  },
};

export default function TeamPage() {
  return <TeamClient />;
}
