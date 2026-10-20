'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { Quote } from "lucide-react";

export default function SambutanContent(props: { initialData: any }) {
  const [data, setData] = useState(props.initialData || {
    name: "Dr. H. Budi Santoso, M.Pd",
    title: "Kepala SMK GaMa",
    message: "Assalamu'alaikum Warahmatullahi Wabarakatuh, \n Salam Sejahtera bagi kita semua.\n\nPuji syukur senantiasa kita panjatkan kehadirat Tuhan Yang Maha Esa atas segala limpahan rahmat dan karunia-Nya. Selamat datang di website resmi SMK GaMa.\n\nDi era digital dan revolusi industri yang berkembang pesat ini, pendidikan kejuruan (vokasi) memiliki peran yang sangat strategis. SMK GaMa berkomitmen untuk tidak hanya mencetak lulusan yang cerdas secara akademik, tetapi juga memiliki keterampilan teknis yang mumpuni, karakter yang kuat, dan kesiapan mental untuk bersaing di dunia kerja maupun wirausaha.\n\nMelalui website ini, kami berharap dapat memberikan informasi yang transparan, cepat, dan akurat kepada seluruh elemen masyarakat, orang tua wali murid, serta dunia usaha dan dunia industri (DUDI) yang menjadi mitra strategis kami. Kami terus berupaya meningkatkan kualitas layanan, fasilitas praktik, dan kurikulum yang senantiasa disesuaikan dengan kebutuhan industri masa kini.\n\nKepada seluruh siswa-siswi SMK GaMa, teruslah bermimpi besar, asah kompetensi kalian, dan jadilah kebanggaan bangsa. Kepada para guru dan staf, mari kita terus berinovasi dalam memberikan layanan pendidikan terbaik.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.",
    imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=600&auto=format&fit=crop"
  });

  return (
    <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
      
      {/* Foto Kepala Sekolah */}
      <div className="w-full lg:w-1/3 flex flex-col items-center">
        <div className="relative w-64 h-80 rounded-2xl overflow-hidden shadow-2xl mb-6">
          <Image 
            src={data.imageUrl} 
            alt="Foto Kepala Sekolah"
            fill
            className="object-cover"
          />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">{data.name}</h3>
        <p className="text-blue-600 dark:text-blue-400 font-medium text-center">{data.title}</p>
      </div>

      {/* Teks Sambutan */}
      <div className="w-full lg:w-2/3">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 relative">
          <Quote className="absolute top-6 left-6 text-blue-100 dark:text-gray-800 w-16 h-16 -z-10" />
          
          <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed z-10 relative whitespace-pre-wrap">
            {data.message}
          </div>
        </div>
      </div>

    </div>
  );
}
