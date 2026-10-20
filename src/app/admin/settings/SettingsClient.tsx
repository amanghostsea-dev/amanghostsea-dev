'use client';

import { useState, useEffect } from 'react';
import { Settings, Image as ImageIcon, Save, Check, ArrowLeft, Upload, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { saveWebSettings } from './actions';

export default function SettingsClient(props: { initialData: any }) {
  const [formData, setFormData] = useState(props.initialData || {
    schoolName: 'SMK GaMa',
    tagline: 'Membangun Generasi Siap Kerja & Berprestasi',
    logoUrl: '',
    primaryColor: '#2563eb'
  });

  const [isSaved, setIsSaved] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(props.initialData?.logoUrl || null);

  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const dataToSave = { ...formData };
    if (previewLogo) {
      dataToSave.logoUrl = previewLogo;
    }

    const res = await saveWebSettings(dataToSave);
    if (res.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Gunakan FileReader untuk mengonversi gambar ke Base64 agar bisa disimpan di localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewLogo(base64String);
        setFormData({ ...formData, logoUrl: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="text-gray-600" /> Pengaturan Web & Identitas
            </h1>
            <p className="text-gray-500 text-sm">Sesuaikan nama sekolah, logo, dan tampilan website utama</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden text-gray-900 dark:text-white">
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
            
            {/* Section: Identitas Sekolah */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Identitas Sekolah</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nama Sekolah</label>
                  <input 
                    type="text" 
                    value={formData.schoolName} 
                    onChange={e => setFormData({...formData, schoolName: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    placeholder="Contoh: SMKN 1 Probolinggo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tagline Utama</label>
                  <input 
                    type="text" 
                    value={formData.tagline} 
                    onChange={e => setFormData({...formData, tagline: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    placeholder="Mencetak Generasi Unggul & Berkarakter"
                  />
                </div>
              </div>
            </div>

            {/* Section: Logo Sekolah */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Logo Website</h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Preview Logo */}
                <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative">
                  {previewLogo ? (
                    <img src={previewLogo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <>
                      <ImageIcon className="text-gray-400 mb-2" size={32} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Belum ada logo</span>
                    </>
                  )}
                </div>

                {/* Upload Control */}
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Unggah logo resmi sekolah. Logo ini akan ditampilkan di pojok kiri atas halaman utama (Navigation Bar) dan bagian Footer. Format yang didukung: PNG, JPG, SVG (Maks: 2MB).
                  </p>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <button type="button" className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm">
                      <Upload size={18} /> Pilih File Logo Baru
                    </button>
                  </div>
                  {formData.logoUrl && <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">File terpilih: {formData.logoUrl}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              {isSaved && (
                <span className="flex items-center gap-2 text-green-600 font-medium mr-4 animate-pulse">
                  <Check size={18} /> Perubahan Disimpan!
                </span>
              )}
              <button 
                type="submit" 
                disabled={loading} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm shadow-blue-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Simpan Pengaturan
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
