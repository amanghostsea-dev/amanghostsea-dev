import prisma from '@/lib/prisma';
import JobsDashboard from './JobsDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminBKKJobsPage() {
  const [jobs, applications] = await Promise.all([
    prisma.jobListing.findMany({
      include: {
        _count: {
          select: { applications: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.jobApplication.findMany({
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
          Pusat Karir & Bursa Kerja Khusus (BKK)
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola lowongan pekerjaan mitra industri terverifikasi, tinjau berkas lamaran masuk siswa & alumni, serta panggil kandidat via WhatsApp.
        </p>
      </div>
      
      <JobsDashboard initialJobs={jobs} initialApplications={applications} />
    </div>
  );
}
