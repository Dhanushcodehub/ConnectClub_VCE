import { Metadata } from 'next';
import TimelineClient from './TimelineClient';

export const metadata: Metadata = {
  title: 'Timeline | Connect Club VCE',
  description: 'Follow the journey of Connect Club — key milestones, achievements, and memorable moments at Vardhaman College of Engineering.',
  openGraph: {
    title: 'Timeline | Connect Club VCE',
    description: 'Follow the journey of Connect Club — key milestones, achievements, and memorable moments at Vardhaman College of Engineering.',
    url: 'https://connectclub-vce.vercel.app/timeline',
    siteName: 'Connect Club VCE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Timeline | Connect Club VCE',
    description: 'Follow the journey of Connect Club — key milestones, achievements, and memorable moments at Vardhaman College of Engineering.',
  },
};

export default function TimelinePage() {
  return <TimelineClient />;
}
