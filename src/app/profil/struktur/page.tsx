import Navbar from "@/components/Navbar";
import { Network } from "lucide-react";
import StrukturContent from "./StrukturContent";
import { getStrukturData } from "@/app/admin/struktur/actions";
import { getWebSettings } from "@/app/admin/settings/actions";

export async function generateMetadata() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";
  return {
    title: `Struktur Organisasi - ${schoolName}`,
    description: `Struktur organisasi dan susunan kepengurusan manajemen ${schoolName}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function StrukturOrganisasiPage() {
  const initialData = await getStrukturData();
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <Navbar />
      
      {/* Header Section */}
      <section className="pt-32 pb-16 bg-blue-600 dark:bg-blue-900 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Struktur Organisasi</h1>
          <p className="text-blue-100 text-lg">Susunan Kepengurusan dan Manajemen {schoolName}</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Network className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">Sinergi Dalam Mendidik</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Untuk memastikan seluruh kegiatan operasional dan pembelajaran berjalan optimal, {schoolName} didukung oleh jajaran manajemen dan tenaga pendidik yang tersusun dalam struktur organisasi yang profesional dan berdedikasi tinggi.
            </p>
          </div>

          <StrukturContent initialData={initialData} />

        </div>
      </section>
    </div>
  );
}
