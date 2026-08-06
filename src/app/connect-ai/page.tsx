import { Metadata } from 'next';
import ConnectAIClient from './ConnectAIClient';

export const metadata: Metadata = {
  title: 'Connect AI | Connect Club VCE',
  description: 'Chat with Connect AI — your intelligent assistant for everything about Connect Club at Vardhaman College of Engineering.',
  openGraph: {
    title: 'Connect AI | Connect Club VCE',
    description: 'Chat with Connect AI — your intelligent assistant for everything about Connect Club at Vardhaman College of Engineering.',
    url: 'https://connectclub-vce.vercel.app/connect-ai',
    siteName: 'Connect Club VCE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Connect AI | Connect Club VCE',
    description: 'Chat with Connect AI — your intelligent assistant for everything about Connect Club at Vardhaman College of Engineering.',
  },
};

export default function ConnectAIPage() {
  return <ConnectAIClient />;
}
