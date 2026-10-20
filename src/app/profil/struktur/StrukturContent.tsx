'use client';

import { useState, useEffect } from 'react';
import OrgChart, { OrgNode } from '@/components/OrgChart';
import { Users2 } from 'lucide-react';

const defaultData: OrgNode = {
  id: "1",
  name: "Dr. H. Budi Santoso, M.Pd",
  title: "Kepala Sekolah",
  photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop",
  bio: "Lahir di Jakarta, 15 Agustus 1975. Memiliki pengalaman di bidang manajemen pendidikan vokasi lebih dari 15 tahun.",
  children: [
    {
      id: "2",
      name: "Siti Aminah, S.Pd, M.T",
      title: "Wakasek Kurikulum",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop",
      bio: "Menyelesaikan pendidikan S2 di ITB. Bertanggung jawab penuh terhadap penyusunan dan implementasi kurikulum."
    },
    {
      id: "3",
      name: "Drs. Ahmad Yani",
      title: "Wakasek Kesiswaan",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop",
      bio: "Fokus pada pengembangan karakter, disiplin, dan prestasi non-akademik siswa."
    },
    {
      id: "4",
      name: "Ir. Hendra Wijaya",
      title: "Wakasek Sarpras",
      photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop",
      bio: "Mengelola dan memastikan kelayakan seluruh fasilitas praktik dan belajar siswa."
    }
  ]
};

export default function StrukturContent(props: { initialData: OrgNode | null }) {
  const [chartData, setChartData] = useState<OrgNode | null>(props.initialData || defaultData);

  if (!chartData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Users2 className="w-16 h-16 animate-pulse mb-4" />
        <p>Memuat Struktur Organisasi...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-4 md:p-8 shadow-xl border border-gray-100 dark:border-gray-800">
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          * Klik pada kartu (foto/nama) untuk melihat detail biodata lengkap.
        </p>
      </div>
      <OrgChart data={chartData} />
    </div>
  );
}
