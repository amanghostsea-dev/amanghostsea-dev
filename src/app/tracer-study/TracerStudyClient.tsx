'use client';

import { useState } from 'react';
import { User, CheckCircle2, Search, Briefcase, GraduationCap, Building2, HelpCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';

export default function TracerStudyClient({ schoolName = "SMK GaMa" }: { schoolName?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  
  const [alumniData, setAlumniData] = useState<any>(null);
  
  // Form State
  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState('');
  
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setVerifyError('');

    try {
      const res = await fetch('/api/tracer-study/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisn, fullName })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setVerifyError(data.error || 'Terjadi kesalahan');
      } else {
        setAlumniData(data.alumni);
        setStep(2);
      }
    } catch (err) {
      setVerifyError('Gagal menghubungi server.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch('/api/tracer-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumniId: alumniData.id,
          status,
          ...data
        })
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        alert(result.error || 'Terjadi kesalahan saat menyimpan data');
      } else {
        setStep(4); // Success step
      }
    } catch (err) {
      alert('Gagal menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <Link href="/" className="inline-block mb-6 text-blue-600 dark:text-blue-400 hover:underline font-medium">
            &larr; Kembali ke Beranda
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            Tracer Study Alumni
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Bantu kami melacak jejak karier Anda untuk pengembangan mutu {schoolName} ke depan.
          </p>
        </div>

        {/* Progress Steps */}
        {step < 4 && (
          <div className="mb-8 flex items-center justify-center gap-4 animate-slide-up delay-100">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
            <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
            <div className={`w-12 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-zoom-in delay-200">
          
          {/* STEP 1: Verifikasi */}
          {step === 1 && (
            <div className="p-8 sm:p-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Search className="text-blue-600" /> Pencarian Data Alumni
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Silakan masukkan NISN dan Nama Lengkap sesuai dengan data saat Anda bersekolah di {schoolName}. Data yang dimasukkan harus sama persis dengan yang ada di database.
              </p>
              
              {verifyError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm">
                  {verifyError}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">NISN</label>
                  <input 
                    required 
                    type="number" 
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" 
                    placeholder="Masukkan NISN Anda" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Lengkap</label>
                  <input 
                    required 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" 
                    placeholder="Masukkan Nama Lengkap Anda" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isChecking}
                  className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isChecking ? <><Loader2 className="animate-spin" /> Mencari Data...</> : 'Lanjutkan Pengecekan'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Detail Read-Only & Status Saat Ini */}
          {step === 2 && alumniData && (
            <div className="p-8 sm:p-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <User className="text-blue-600" /> Profil Alumni
              </h2>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider font-bold">Data berikut diambil dari database dan tidak dapat diubah</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">Nama Lengkap</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{alumniData.fullName}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">NISN</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{alumniData.nisn}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">Tahun Lulus</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{alumniData.graduationYear}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 dark:text-gray-400">Jurusan</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{alumniData.major}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Status Anda Saat Ini</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'BEKERJA', label: 'Bekerja', icon: <Briefcase size={20}/> },
                    { id: 'KULIAH', label: 'Kuliah', icon: <GraduationCap size={20}/> },
                    { id: 'WIRAUSAHA', label: 'Wirausaha', icon: <Building2 size={20}/> },
                    { id: 'MENCARI_KERJA', label: 'Mencari Kerja', icon: <Search size={20}/> }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setStatus(item.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${status === item.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'}`}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setStep(3)} 
                  disabled={!status}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-bold transition-all"
                >
                  Lanjut ke Kuisioner
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Kuisioner Detail */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
                <HelpCircle className="text-blue-600" /> Detail Tracer Study
              </h2>

              {(status === 'BEKERJA' || status === 'WIRAUSAHA') && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Perusahaan / Usaha</label>
                    <input required type="text" name="companyName" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jabatan / Posisi</label>
                    <input required type="text" name="jobTitle" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kisaran Pendapatan per Bulan (Opsional)</label>
                    <select name="salary" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white">
                      <option value="">Pilih Kisaran Pendapatan</option>
                      <option value="< 3 Juta">&lt; Rp 3.000.000</option>
                      <option value="3 - 5 Juta">Rp 3.000.000 - Rp 5.000.000</option>
                      <option value="5 - 10 Juta">Rp 5.000.000 - Rp 10.000.000</option>
                      <option value="> 10 Juta">&gt; Rp 10.000.000</option>
                    </select>
                  </div>
                </div>
              )}

              {status === 'KULIAH' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Perguruan Tinggi</label>
                    <input required type="text" name="university" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fakultas / Program Studi</label>
                    <input required type="text" name="faculty" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" />
                  </div>
                </div>
              )}

              {status === 'MENCARI_KERJA' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm">
                  Silakan lanjut ke bagian feedback. Kami dari BKK (Bursa Kerja Khusus) juga akan mengirimkan informasi lowongan pekerjaan secara berkala ke email Anda jika tersedia.
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seberapa erat hubungan kompetensi di sekolah dengan pekerjaan/kuliah Anda?</label>
                  <select required name="relevance" className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white">
                    <option value="">Pilih Tingkat Relevansi</option>
                    <option value="Sangat Erat">Sangat Erat</option>
                    <option value="Erat">Erat</option>
                    <option value="Cukup">Cukup</option>
                    <option value="Kurang Erat">Kurang Erat</option>
                    <option value="Tidak Sama Sekali">Tidak Sama Sekali</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kritik & Saran untuk Pengembangan {schoolName}</label>
                  <textarea name="suggestions" rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="Masukan dari Anda sangat berharga bagi kami..."></textarea>
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <button 
                  type="button" 
                  onClick={() => setStep(2)}
                  className="px-6 py-3 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  Kembali
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  {isSubmitting ? <><Loader2 className="animate-spin"/> Menyimpan...</> : <><CheckCircle2 /> Selesai & Simpan</>}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Selesai */}
          {step === 4 && (
            <div className="p-12 text-center animate-zoom-in">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">
                Terima Kasih, {alumniData?.fullName}!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Data Tracer Study Anda telah berhasil disimpan di sistem BKK {schoolName}. Sukses selalu untuk perjalanan karier Anda!
              </p>
              <Link href="/" className="px-8 py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white rounded-xl font-bold transition-all inline-block">
                Kembali ke Beranda
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
