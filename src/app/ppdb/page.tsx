import { getWebSettings } from "@/app/admin/settings/actions";
import prisma from "@/lib/prisma";
import PPDBClient from "./PPDBClient";

export async function generateMetadata() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";
  return {
    title: `PPDB - ${schoolName}`,
    description: `Pendaftaran Peserta Didik Baru ${schoolName}`,
  };
}

export const dynamic = "force-dynamic";

export default async function PPDBPage() {
  const [settings, jurusanList] = await Promise.all([
    getWebSettings(),
    prisma.jurusan.findMany({
      orderBy: { createdAt: "asc" },
    }).catch(() => [])
  ]);

  const schoolName = settings?.schoolName || "SMK GaMa";
  
  return <PPDBClient schoolName={schoolName} jurusanList={jurusanList} />;
}

