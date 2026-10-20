import Navbar from "@/components/Navbar";
import SambutanContent from "./SambutanContent";
import { getSambutanData } from "@/app/admin/sambutan/actions";

import { getWebSettings } from "@/app/admin/settings/actions";

export async function generateMetadata() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";
  return {
    title: `Sambutan Kepala Sekolah - ${schoolName}`,
    description: `Sambutan hangat dari Kepala Sekolah ${schoolName} untuk seluruh siswa, orang tua, dan masyarakat.`,
  };
}

export const dynamic = "force-dynamic";

export default async function SambutanPage() {
  const initialData = await getSambutanData();
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <Navbar />
      
      {/* Header Section */}
      <section className="pt-32 pb-16 bg-blue-600 dark:bg-blue-900 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Sambutan Kepala Sekolah</h1>
          <p className="text-blue-100 text-lg">Membangun Generasi Vokasi yang Siap Menghadapi Tantangan Global</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SambutanContent initialData={initialData} />
        </div>
      </section>
    </div>
  );
}
