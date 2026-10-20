'use client';

import { useState } from 'react';

import { Sparkles, Upload, FileText, Briefcase, CheckCircle, ArrowRight, Bot } from 'lucide-react';
import Link from 'next/link';

export default function AIMatcherPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleScan = () => {
    setIsScanning(true);
    // Simulate AI scanning and matching
    setTimeout(() => {
      setIsScanning(false);
      setResults([
        {
          id: 1,
          title: 'Junior Web Developer',
          company: 'TechNusantara Solutions',
          matchPercentage: 98,
          reasons: ['Keahlian React sesuai', 'Pengalaman Next.js relevan']
        },
        {
          id: 3,
          title: 'Staff Administrasi & Keuangan',
          company: 'Bank Mandiri Syariah',
          matchPercentage: 65,
          reasons: ['Ada basic excel, namun kurang di akuntansi']
        }
      ]);
    }, 3000);
  };

  return (
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl mb-6">
            <Bot size={32} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            AI CV Matcher
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Unggah CV atau ketik keahlianmu. Sistem AI kami akan menganalisis dan mencocokkan profilmu dengan lowongan pekerjaan yang paling tepat.
          </p>
        </div>

        {!results && (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 transition-all">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-10 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all">
                <Upload size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unggah CV (PDF)</h3>
              <p className="text-gray-500 mb-6">atau drag & drop file ke sini</p>
              
              <button 
                onClick={handleScan}
                disabled={isScanning}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 mx-auto disabled:opacity-70"
              >
                {isScanning ? (
                  <>
                    <Sparkles className="animate-spin" size={20} /> Menganalisis CV...
                  </>
                ) : (
                  <>
                    <FileText size={20} /> Mulai Analisis
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-8">
              <p className="text-sm text-gray-500 text-center mb-4">Atau ketik keahlian utama secara manual</p>
              <textarea 
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none h-32"
                placeholder="Contoh: Menguasai HTML, CSS, JavaScript, React. Pengalaman membuat web sekolah..."
              ></textarea>
              <button 
                onClick={handleScan}
                disabled={isScanning}
                className="w-full mt-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 px-8 py-3 rounded-xl font-bold transition-all shadow-sm"
              >
                Cari Lowongan yang Cocok
              </button>
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-xl border border-green-200 dark:border-green-800/30 mb-8">
              <div className="flex items-center gap-3 font-medium">
                <CheckCircle size={24} />
                Analisis Selesai! Menemukan {results.length} lowongan yang cocok.
              </div>
              <button onClick={() => setResults(null)} className="text-sm underline hover:text-green-800">Coba Ulang</button>
            </div>

            {results.map((job: any) => (
              <div key={job.id} className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-8 items-center relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl group-hover:bg-blue-100 transition-colors"></div>
                
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{job.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2">
                        <Briefcase size={16} /> {job.company}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-blue-500 text-blue-600 font-bold text-xl mb-1">
                        {job.matchPercentage}%
                      </div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tingkat Kecocokan</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-500" /> Analisis AI:
                    </h4>
                    <ul className="space-y-2">
                      {job.reasons.map((reason: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md w-full md:w-auto flex justify-center items-center gap-2">
                    Lamar Sekarang <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
  );
}
