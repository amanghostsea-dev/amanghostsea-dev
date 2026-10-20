import prisma from '@/lib/prisma';
import JobsDashboard from './JobsDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminBKKJobsPage() {
  const jobs = await prisma.jobListing.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Kelola Lowongan BKK</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Tambahkan atau perbarui data lowongan pekerjaan untuk ditampilkan di portal BKK.
      </p>
      
      <JobsDashboard initialJobs={jobs} />
    </div>
  );
}
