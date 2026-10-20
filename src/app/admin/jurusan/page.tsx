import prisma from "@/lib/prisma";
import JurusanClient from "./JurusanClient";
export const dynamic = "force-dynamic";

export default async function JurusanPage() {
  const initialJurusan = await prisma.jurusan.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <JurusanClient initialJurusan={initialJurusan} />;
}
