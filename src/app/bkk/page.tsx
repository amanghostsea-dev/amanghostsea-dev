import prisma from "@/lib/prisma";
import { getWebSettings } from "@/lib/settings";
import BKKLandingClient from "./BKKLandingClient";


export const dynamic = "force-dynamic";

const FALLBACK_JOBS = [
  {
    id: "sample-1",
    title: "Junior Web Developer & IT Support",
    company: "PT Cyber Solusindo Nusantara",
    location: "Jakarta Barat / Hybrid",
    salary: "Rp 5.000.000 - Rp 7.500.000",
    type: "Full-time",
    description: "Membantu pengembangan sistem internal, maintenance jaringan komputer sekolah/kantor, dan integrasi API.",
    requirements: "Lulusan SMK RPL/TKJ, menguasai HTML/CSS/JS, memahami dasar database & git.",
    tags: "RPL,TKJ,React,NextJS,Jaringan",
    department: "Rekayasa Perangkat Lunak",
    contactEmail: "hrd@cybersolusindo.id",
    contactWa: "6281234567890",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isHot: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "sample-2",
    title: "Teknisi Otomotif & Servis Berkala",
    company: "Auto2000 & Astra Group Partner",
    location: "Tangerang & Serpong",
    salary: "Rp 4.800.000 - Rp 6.200.000",
    type: "Full-time",
    description: "Melakukan perawatan berkala, diagnosa mesin EFI, sistem transmisi, dan kelistrikan kendaraan roda empat.",
    requirements: "Lulusan SMK TKR/Otomotif, disiplin, memiliki sertifikasi kompetensi kejuruan.",
    tags: "TKR,Otomotif,Service,EFI",
    department: "Teknik Kendaraan Ringan",
    contactEmail: "recruitment@auto2000-partner.id",
    contactWa: "6281987654321",
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    isHot: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "sample-3",
    title: "Staff Akuntansi & Administrasi Keuangan",
    company: "PT Prima Karya Logistik",
    location: "Jakarta Pusat",
    salary: "Rp 4.500.000 - Rp 5.800.000",
    type: "Kontrak",
    description: "Membuat invoice, pencatatan jurnal umum, rekonsiliasi bank, dan pengarsipan bukti kas masuk/keluar.",
    requirements: "Lulusan SMK AKL / Akuntansi, teliti, mahir Microsoft Excel & aplikasi Accurate.",
    tags: "AKL,Akuntansi,Excel,Finance",
    department: "Akuntansi",
    contactEmail: "karir@primakarya.com",
    contactWa: "6285211223344",
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    isHot: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export default async function BKKPage() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";

  let jobListings: any[] = [];
  try {
    jobListings = await prisma.jobListing.findMany({
      orderBy: [
        { isHot: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    if (!jobListings || jobListings.length === 0) {
      jobListings = FALLBACK_JOBS;
    }
  } catch (err) {
    console.warn("Could not load jobs from database, using fallback sample data:", err);
    jobListings = FALLBACK_JOBS;
  }

  return <BKKLandingClient initialJobs={jobListings} schoolName={schoolName} />;
}

