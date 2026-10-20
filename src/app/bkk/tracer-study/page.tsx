import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import TracerStudyClient from './TracerStudyClient';

export const metadata: Metadata = {
  title: 'Tracer Study BKK - SMK',
  description: 'Sistem Tracer Study BKK SMK',
};

export default function TracerStudyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <Navbar />
      <TracerStudyClient />
    </div>
  );
}
