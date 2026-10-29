import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import PresensiClient from "./PresensiClient";

export const dynamic = 'force-dynamic';

export default async function GuruPresensiPage() {
  const cookieStore = await cookies();
  const authName = cookieStore.get('auth_name')?.value;
  const authUser = cookieStore.get('auth_user')?.value;

  let teacherName = authName;
  if (!teacherName && authUser) {
    try {
      const user = await prisma.user.findFirst({ 
        where: { 
          OR: [
            { username: authUser },
            { nisn: authUser }
          ]
        },
        select: { name: true }
      });
      if (user) teacherName = user.name;
    } catch {}
  }
  if (!teacherName) teacherName = 'Bpk. Ahmad ST';

  const students = await prisma.user.findMany({
    where: { role: 'Siswa' },
    select: {
      id: true,
      name: true,
      username: true,
      nisn: true,
      role: true,
      status: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <PresensiClient students={students} teacherName={teacherName} />
    </main>
  );
}
