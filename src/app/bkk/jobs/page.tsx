import prisma from "@/lib/prisma";
import JobsListClient from "./JobsListClient";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

const FALLBACK_JOBS = [
  {
    id: "sample-1",
    title: "Junior Web Developer & Frontend Engineer",
    company: "PT Cyber Solusindo Nusantara",
    location: "Jakarta Barat / Hybrid",
    salary: "Rp 5.500.000 - Rp 7.500.000",
    type: "Full-time",
    description: "Membantu pengembangan antarmuka web modern dengan Next.js, React, dan integrasi API.",
    requirements: "Lulusan SMK RPL, menguasai HTML/CSS/JS, memahami dasar database & Git.",
    tags: "RPL,NextJS,React,Frontend",
    department: "RPL",
    contactEmail: "hrd@cybersolusindo.id",
    contactWa: "6281234567890",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isHot: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "sample-2",
    title: "Network Support & Cloud Infrastructure",
    company: "Biznet Networks Partner",
    location: "Jakarta & Tangerang",
    salary: "Rp 5.000.000 - Rp 6.800.000",
    type: "Full-time",
    description: "Instalasi dan konfigurasi perangkat MikroTik, Cisco, maintenance server Linux, serta monitoring fiber optic.",
    requirements: "Lulusan SMK TJKT, memahami routing, switching, dan dasar cyber defense.",
    tags: "TJKT,Jaringan,Mikrotik,Cisco,Cloud",
    department: "TJKT",
    contactEmail: "recruitment@biznet-partner.id",
    contactWa: "6281987654321",
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    isHot: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "sample-3",
    title: "Staff Administrasi Perkantoran & Public Relations",
    company: "PT Astra International Partner",
    location: "Jakarta Pusat",
    salary: "Rp 4.800.000 - Rp 6.200.000",
    type: "Full-time",
    description: "Korespondensi bisnis digital, pengelolaan kearsipan cloud, customer relations, dan penyusunan laporan operasional.",
    requirements: "Lulusan SMK MPLB, komunikatif, menguasai Google Workspace & Microsoft Office.",
    tags: "MPLB,Administrasi,Perkantoran,Office,Humas",
    department: "MPLB",
    contactEmail: "karir@astra-partner.id",
    contactWa: "6285211223344",
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    isHot: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "sample-4",
    title: "Creative Motion Graphic & UI/UX Designer",
    company: "Creative Studio Media Nusantara",
    location: "Jakarta Barat",
    salary: "Rp 5.000.000 - Rp 7.000.000",
    type: "Full-time",
    description: "Mendesain aset visual branding, animasi motion graphic promosi, dan desain antarmuka aplikasi web/mobile.",
    requirements: "Lulusan SMK DKV, menguasai Adobe Illustrator/Photoshop, Figma, dan After Effects.",
    tags: "DKV,Design,Motion,Figma,Adobe",
    department: "DKV",
    contactEmail: "talent@creativestudio.id",
    contactWa: "6281776655443",
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    isHot: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export default async function JobsPage() {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <Navbar />
      <JobsListClient initialJobs={jobListings} />
    </div>
  );
}


