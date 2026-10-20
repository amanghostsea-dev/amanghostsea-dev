import prisma from "@/lib/prisma";
import { getWebSettings } from "@/app/admin/settings/actions";
import BKKLandingClient from "./BKKLandingClient";

export const dynamic = "force-dynamic";

export default async function BKKPage() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";

  const jobListings = await prisma.jobListing.findMany({
    orderBy: [
      { isHot: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  return <BKKLandingClient initialJobs={jobListings} schoolName={schoolName} />;
}
