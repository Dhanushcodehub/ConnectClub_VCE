import { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us | Connect Club VCE',
  description: 'Get in touch with Connect Club at Vardhaman College of Engineering. Reach out for collaborations, queries, or to join our community.',
  openGraph: {
    title: 'Contact Us | Connect Club VCE',
    description: 'Get in touch with Connect Club at Vardhaman College of Engineering. Reach out for collaborations, queries, or to join our community.',
    url: 'https://connectclub-vce.vercel.app/contact',
    siteName: 'Connect Club VCE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | Connect Club VCE',
    description: 'Get in touch with Connect Club at Vardhaman College of Engineering. Reach out for collaborations, queries, or to join our community.',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
