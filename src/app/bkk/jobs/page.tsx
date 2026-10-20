import prisma from "@/lib/prisma";
import JobsListClient from "./JobsListClient";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobListings = await prisma.jobListing.findMany({
    orderBy: [
      { isHot: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <Navbar />
      <JobsListClient initialJobs={jobListings} />
    </div>
  );
}

