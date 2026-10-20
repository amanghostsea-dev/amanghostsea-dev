import { Suspense } from 'react';
import { getWebSettings } from '@/app/admin/settings/actions';
import StatusClient from './StatusClient';

export async function generateMetadata() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || 'SMK GaMa';
  return {
    title: `Cek Status Pendaftaran & Verifikasi PPDB - ${schoolName}`,
    description: `Pantau hasil seleksi dan status verifikasi berkas PPDB online di ${schoolName}`,
  };
}

export const dynamic = 'force-dynamic';

export default async function PPDBStatusPage() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || 'SMK GaMa';
  const contactPhone = settings?.ppdbPhone || '082246464677';

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">Memuat portal cek status PPDB...</p>
        </div>
      </div>
    }>
      <StatusClient schoolName={schoolName} contactPhone={contactPhone} />
    </Suspense>
  );
}
