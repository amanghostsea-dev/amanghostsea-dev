import { getWebSettings, getPPDBPaymentConfig } from "@/app/admin/settings/actions";
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

export default async function PPDBPage({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const [settings, paymentConfig, jurusanList] = await Promise.all([
    getWebSettings(),
    getPPDBPaymentConfig(),
    prisma.jurusan.findMany({
      orderBy: { createdAt: "asc" },
    }).catch(() => [])
  ]);

  const schoolName = settings?.schoolName || "SMK GaMa";
  const defaultTheme = (resolvedParams?.theme || settings?.ppdbTheme || "cyber-cards") as 'cyber-cards' | 'stepper' | 'dark-glass';
  
  return (
    <PPDBClient 
      schoolName={schoolName} 
      jurusanList={jurusanList} 
      defaultTheme={defaultTheme} 
      paymentConfig={paymentConfig}
    />
  );
}

