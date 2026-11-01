import prisma from "@/lib/prisma";
import JurusanClient from "./JurusanClient";
import { getManagedClasses } from "@/lib/kelas-service";

export const dynamic = "force-dynamic";

export default async function JurusanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "jurusan" } = await searchParams;

  const [initialJurusan, initialClasses, teachers, studentGrades] = await Promise.all([
    prisma.jurusan.findMany({
      orderBy: { code: "asc" },
    }),
    getManagedClasses(),
    prisma.user.findMany({
      where: {
        role: { in: ["Guru", "Super Admin"] },
        status: "Aktif",
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.studentGrade.findMany({
      select: {
        studentClass: true,
        studentName: true,
      },
      distinct: ["studentClass", "studentName"],
    }),
  ]);

  // Hitung jumlah siswa per kelas riil dari database
  const studentCountMap: Record<string, number> = {};
  for (const sg of studentGrades) {
    if (sg.studentClass) {
      studentCountMap[sg.studentClass] = (studentCountMap[sg.studentClass] || 0) + 1;
    }
  }

  return (
    <JurusanClient 
      initialJurusan={initialJurusan}
      initialClasses={initialClasses}
      teachers={teachers}
      studentCountMap={studentCountMap}
      initialTab={tab === "kelas" ? "kelas" : "jurusan"}
    />
  );
}
