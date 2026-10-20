import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AiMatcherClient from './AiMatcherClient';

export const metadata: Metadata = {
  title: 'AI Matcher BKK - SMK',
  description: 'AI Matcher BKK',
};

export default function AiMatcherPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <Navbar />
      <AiMatcherClient />
    </div>
  );
}
