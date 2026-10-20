import prisma from "@/lib/prisma";
import BeritaClient from "./BeritaClient";
export const dynamic = "force-dynamic";

export default async function BeritaPage() {
  const initialBerita = await prisma.berita.findMany({
    orderBy: { createdAt: "desc" },
  });

  // map createdAt to date string for the client component
  const formattedBerita = initialBerita.map((item) => ({
    ...item,
    date: item.createdAt.toISOString().split('T')[0],
  }));

  return <BeritaClient initialBerita={formattedBerita} />;
}
