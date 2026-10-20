import prisma from "@/lib/prisma";
import TracerDashboard from "./TracerDashboard";

export const dynamic = "force-dynamic";

export default async function AdminTracerStudyPage() {
  const alumniList = await prisma.alumni.findMany({
    include: {
      tracerStudy: true
    }
  });

  return (
    <div className="p-4 md:p-8">
      <TracerDashboard initialAlumni={alumniList} />
    </div>
  );
}
