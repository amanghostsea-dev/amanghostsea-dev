'use client';

import { useState } from 'react';
import { 
  GraduationCap, Briefcase, ChevronRight, ChevronLeft, 
  CheckCircle, Building2, BookOpen, UserCircle, Rocket,
  Search, Lock, AlertCircle, Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function TracerStudyClient() {
  const [step, setStep] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [dataFound, setDataFound] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [formData, setFormData] = useState({
    alumniId: '',
    // Step 1: Search & Verifikasi
    nisn: '',
    // Data dari DB (Read Only)
    nama: '',
    tahunLulus: '',
    jurusan: '',
    
    // Step 2: Status
    status: '', // bekerja, kuliah, wirausaha, mencari_kerja
    
    // Step 3: Detail
    // - Bekerja
    namaInstansi: '',
    bidangPerusahaan: '',
    jabatan: '',
    pendapatan: '',
    kesesuaianJurusan: '',
    bulanMasukKerja: '',
    
    // - Kuliah
    namaKampus: '',
    jurusanKuliah: '',
    jenjang: '',
    
    // - Wirausaha
    bidangUsaha: '',
    jumlahPegawai: '',
    omset: '',
    
    // - Mencari Kerja
    lamaMencari: '',
    kendala: '',
    ikutPelatihan: '',
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) {
      if (step === 2) {
        // Reset search if going back to step 1
        setDataFound(false);
        setFormData({
          ...formData,
          nama: '',
          tahunLulus: '',
          jurusan: '',
          alumniId: '',
        });
      }
      setStep(step - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSearchNISN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.nisn.length < 5) {
      setSearchError('NISN tidak valid. Minimal 5 digit.');
      return;
    }
    if (!formData.nama) {
      setSearchError('Nama lengkap harus diisi untuk verifikasi.');
      return;
    }
    
    setSearchError('');
    setIsSearching(true);
    
    try {
      const res = await fetch('/api/tracer-study/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisn: formData.nisn, fullName: formData.nama })
      });
      const data = await res.json();
      
      setIsSearching(false);
      
      if (!res.ok) {
        setSearchError(data.error || 'Terjadi kesalahan');
        return;
      }
      
      setDataFound(true);
      setFormData(prev => ({
        ...prev,
        alumniId: data.alumni.id,
        nama: data.alumni.fullName,
        tahunLulus: data.alumni.graduationYear.toString(),
        jurusan: data.alumni.major
      }));
    } catch (err) {
      setIsSearching(false);
      setSearchError('Gagal menghubungi server.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Cegah submit prematur jika menekan tombol Enter
    if (step === 1 && !dataFound) {
      handleSearchNISN(e);
      return;
    }
    
    if (step === 1 && dataFound) {
      handleNext();
      return;
    }
    
    if (step === 2 && formData.status) {
      handleNext();
      return;
    }

    if (step === 3) {
      try {
        const res = await fetch('/api/tracer-study/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (res.ok) {
          setStep(4); // Pindah ke halaman sukses
        } else {
          alert(data.error || 'Gagal mengirim data Tracer Study');
        }
      } catch(err) {
        alert('Gagal mengirim data');
      }
    }
  };

  return (
      <main className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium mb-4 text-sm">
            <Search size={16} /> Sistem Pelacakan Alumni Terintegrasi
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            Tracer Study <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">SMK GaMa</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Lengkapi data penelusuran karir Anda. Data yang dimasukkan bersifat rahasia dan hanya digunakan untuk pemetaan mutu pendidikan SMK GaMa.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 md:p-10 relative overflow-hidden">
          
          {/* Progress Bar */}
          <div className="flex justify-between items-center mb-10 relative px-2">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-800 rounded-full z-0"></div>
            <div 
              className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full z-0 transition-all duration-500"
              style={{ width: `calc(${((step - 1) / (totalSteps - 1)) * 100}% - 3rem)` }}
            ></div>
            
            {[
              { num: 1, label: 'Verifikasi' },
              { num: 2, label: 'Status' },
              { num: 3, label: 'Detail' },
              { num: 4, label: 'Selesai' }
            ].map((i) => (
              <div key={i.num} className="flex flex-col items-center z-10 gap-2">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 shadow-sm border-2
                    ${step >= i.num 
                      ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-500/30' 
                      : 'bg-white dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-700'}`}
                >
                  {step > i.num ? <CheckCircle size={24} /> : i.num}
                </div>
                <span className={`text-xs font-semibold ${step >= i.num ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {i.label}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Identitas Diri (Verifikasi) */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <Search size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verifikasi Data Alumni</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Silakan masukkan NISN Anda. Sistem akan mencari kecocokan data Anda di database sekolah.</p>
                </div>
                
                {!dataFound ? (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Nomor Induk Siswa Nasional (NISN)</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" name="nisn" value={formData.nisn} onChange={handleChange} required
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-lg tracking-wider"
                        placeholder="Contoh: 0012345678"
                      />
                      <button 
                        type="button"
                        onClick={handleSearchNISN}
                        disabled={isSearching}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-70 flex items-center gap-2"
                      >
                        {isSearching ? <Loader2 size={20} className="animate-spin" /> : 'Cek Data'}
                      </button>
                    </div>
                    {searchError && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle size={16}/> {searchError}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 flex items-center gap-1">
                      <Lock size={12} /> Data dijamin aman dan terenkripsi
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-start gap-3">
                      <CheckCircle className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" size={20} />
                      <div>
                        <h4 className="font-bold text-green-800 dark:text-green-300">Data Ditemukan!</h4>
                        <p className="text-green-600 dark:text-green-400 text-sm">Pastikan data di bawah ini adalah benar milik Anda. Data ini terkunci dari database sekolah.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Nama Lengkap</label>
                        <div className="font-bold text-gray-900 dark:text-white text-lg">{formData.nama}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Tahun Lulus</label>
                          <div className="font-bold text-gray-900 dark:text-white text-lg">{formData.tahunLulus}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Jurusan</label>
                          <div className="font-bold text-gray-900 dark:text-white text-lg">{formData.jurusan}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Status Saat Ini */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-3 mb-6 text-purple-600 dark:text-purple-400">
                  <Briefcase size={28} />
                  <h2 className="text-2xl font-bold">Aktivitas Saat Ini</h2>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6">Pilih status kegiatan utama Anda saat ini (Pilih salah satu).</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'bekerja', title: 'Bekerja', desc: 'Pegawai/Karyawan di instansi', icon: <Building2 className="mb-3" size={32} /> },
                    { id: 'kuliah', title: 'Kuliah', desc: 'Melanjutkan pendidikan', icon: <BookOpen className="mb-3" size={32} /> },
                    { id: 'wirausaha', title: 'Wirausaha', desc: 'Pemilik usaha/Freelance', icon: <Rocket className="mb-3" size={32} /> },
                    { id: 'mencari_kerja', title: 'Mencari Kerja', desc: 'Belum/Sedang mencari', icon: <Briefcase className="mb-3" size={32} /> },
                  ].map((item) => (
                    <label 
                      key={item.id} 
                      className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center group
                        ${formData.status === item.id 
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-md shadow-blue-500/10 scale-105' 
                          : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-800 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900'}`}
                    >
                      <input 
                        type="radio" name="status" value={item.id} 
                        checked={formData.status === item.id} 
                        onChange={handleChange} 
                        className="hidden" 
                      />
                      <div className={`transition-transform duration-300 ${formData.status === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {item.icon}
                      </div>
                      <span className="font-bold text-lg mb-1">{item.title}</span>
                      <span className="text-xs opacity-80">{item.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Detail Status */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-3 mb-8 text-green-600 dark:text-green-400 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <GraduationCap size={28} />
                  <h2 className="text-2xl font-bold">Detail Pekerjaan / Aktivitas</h2>
                </div>

                {formData.status === 'bekerja' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nama Perusahaan / Instansi</label>
                      <input type="text" name="namaInstansi" value={formData.namaInstansi} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cth: PT. Teknologi Nusantara" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Bidang Perusahaan</label>
                      <input type="text" name="bidangPerusahaan" value={formData.bidangPerusahaan} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cth: IT, Manufaktur, Retail" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Jabatan / Posisi</label>
                      <input type="text" name="jabatan" value={formData.jabatan} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cth: Junior Web Developer" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rentang Gaji / Pendapatan (Per Bulan)</label>
                      <select name="pendapatan" value={formData.pendapatan} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Pilih Rentang</option>
                        <option value="<UMR">Di bawah UMR</option>
                        <option value="UMR">Sesuai UMR</option>
                        <option value=">UMR">Di Atas UMR</option>
                        <option value=">10M">Di Atas 10 Juta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Apakah relevan dengan jurusan saat di SMK?</label>
                      <select name="kesesuaianJurusan" value={formData.kesesuaianJurusan} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Pilih...</option>
                        <option value="Sangat Relevan">Sangat Relevan</option>
                        <option value="Relevan">Cukup Relevan</option>
                        <option value="Tidak Relevan">Tidak Relevan</option>
                      </select>
                    </div>
                  </div>
                )}

                {formData.status === 'kuliah' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nama Kampus / Universitas</label>
                      <input type="text" name="namaKampus" value={formData.namaKampus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cth: Universitas Brawijaya" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Jurusan / Program Studi</label>
                      <input type="text" name="jurusanKuliah" value={formData.jurusanKuliah} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cth: Sistem Informasi" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Jenjang Pendidikan</label>
                      <select name="jenjang" value={formData.jenjang} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Pilih Jenjang</option>
                        <option value="D3">Diploma 3 (D3)</option>
                        <option value="D4">Diploma 4 (D4)</option>
                        <option value="S1">Strata 1 (S1)</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Apakah relevan dengan jurusan saat di SMK?</label>
                      <select name="kesesuaianJurusan" value={formData.kesesuaianJurusan} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Pilih...</option>
                        <option value="Sangat Relevan">Sangat Relevan</option>
                        <option value="Relevan">Cukup Relevan</option>
                        <option value="Tidak Relevan">Tidak Lintas Jurusan</option>
                      </select>
                    </div>
                  </div>
                )}

                {formData.status === 'wirausaha' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nama Bisnis / Usaha / Toko</label>
                      <input type="text" name="namaInstansi" value={formData.namaInstansi} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cth: GaMa Tech Solution" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Bidang Usaha</label>
                      <input type="text" name="bidangUsaha" value={formData.bidangUsaha} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cth: Jasa Service Komputer" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rata-rata Omset Bulanan</label>
                      <select name="omset" value={formData.omset} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Pilih Rentang</option>
                        <option value="<1M">&lt; Rp 1.000.000</option>
                        <option value="1-5M">Rp 1.000.000 - Rp 5.000.000</option>
                        <option value="5-10M">Rp 5.000.000 - Rp 10.000.000</option>
                        <option value=">10M">&gt; Rp 10.000.000</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Jumlah Pegawai (Jika ada)</label>
                      <select name="jumlahPegawai" value={formData.jumlahPegawai} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Pilih...</option>
                        <option value="0">Belum ada (Mandiri)</option>
                        <option value="1-5">1 - 5 Orang</option>
                        <option value=">5">Lebih dari 5 Orang</option>
                      </select>
                    </div>
                  </div>
                )}

                {formData.status === 'mencari_kerja' && (
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Sudah berapa lama Anda mencari kerja / menunggu?</label>
                      <select name="lamaMencari" value={formData.lamaMencari} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Pilih...</option>
                        <option value="<3">Kurang dari 3 Bulan</option>
                        <option value="3-6">3 - 6 Bulan</option>
                        <option value=">6">Lebih dari 6 Bulan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Kendala Utama yang Dihadapi (Pilih salah satu/terbesar)</label>
                      <select name="kendala" value={formData.kendala} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Pilih...</option>
                        <option value="Informasi">Kurang informasi lowongan</option>
                        <option value="Skill">Kualifikasi/Skill belum sesuai</option>
                        <option value="Modal">Kekurangan biaya melamar (ongkos/tes)</option>
                        <option value="Keluarga">Alasan Keluarga / Kesehatan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Apakah saat ini Anda sedang/ingin mengikuti kursus/pelatihan tambahan?</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="ikutPelatihan" value="Ya" onChange={handleChange} className="w-5 h-5 text-blue-600" />
                          <span className="text-gray-700 dark:text-gray-300">Ya, Sedang / Ingin</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="ikutPelatihan" value="Tidak" onChange={handleChange} className="w-5 h-5 text-blue-600" />
                          <span className="text-gray-700 dark:text-gray-300">Tidak</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <div className="text-center py-12 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                  <CheckCircle size={48} className="relative z-10" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Terima Kasih, {formData.nama}!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
                  Data penelusuran lulusan Anda telah berhasil diverifikasi dan direkam dalam sistem Tracer Study SMK GaMa. Kami bangga dengan perjalanan karir Anda!
                </p>
                
                {formData.status === 'mencari_kerja' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900 mb-8 max-w-lg mx-auto">
                    <p className="text-blue-800 dark:text-blue-300 font-medium text-sm">
                      Mengingat status Anda sedang mencari kerja, sistem AI Matcher kami telah menyimpan profil Anda. Kami akan segera memberitahu Anda jika ada lowongan mitra industri yang cocok!
                    </p>
                  </div>
                )}

                <div className="flex justify-center gap-4">
                  <Link href="/bkk" className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    Kembali ke Beranda BKK
                  </Link>
                  <Link href="/bkk/jobs" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/30">
                    Eksplor Lowongan Kerja
                  </Link>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {step < 4 && (
              <div className="mt-12 flex justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handlePrev}
                  className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${
                    step === 1 
                      ? 'invisible' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <ChevronLeft size={20} className="mr-1" /> Kembali
                </button>
                
                {step === 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!dataFound}
                    className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                  >
                    Lanjutkan <ChevronRight size={20} className="ml-1" />
                  </button>
                ) : step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={step === 2 && !formData.status}
                    className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                  >
                    Selanjutnya <ChevronRight size={20} className="ml-1" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30"
                  >
                    Kirim Data <CheckCircle size={20} className="ml-2" />
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </main>
  );
}
