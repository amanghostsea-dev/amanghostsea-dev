'use client';

import { useState, useEffect } from 'react';
import { UserCircle, Save, Check, ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { saveSambutanData } from './actions';

export default function SambutanClient({ initialData }: { initialData: any }) {
  const [formData, setFormData] = useState(initialData || {
    name: 'Dr. H. Budi Santoso, M.Pd',
    title: 'Kepala SMK GaMa',
    message: "Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\nPuji syukur senantiasa kita panjatkan...\n\nDi era digital...",
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=600&auto=format&fit=crop'
  });

  const [isSaved, setIsSaved] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(formData.imageUrl);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const dataToSave = { ...formData };
    if (previewImage) {
      dataToSave.imageUrl = previewImage;
    }
    
    const res = await saveSambutanData(dataToSave);
    if (res.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
        setFormData({ ...formData, imageUrl: base64String });
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
              <UserCircle className="text-gray-600" /> Kelola Sambutan
            </h1>
            <p className="text-gray-500 text-sm">Sesuaikan profil dan pesan sambutan Kepala Sekolah</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden text-gray-900 dark:text-white">
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
            
            {/* Section: Identitas */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Profil Kepala Sekolah</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap & Gelar</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Jabatan / Posisi</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section: Foto */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Foto Profil</h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-32 h-40 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                  {previewImage ? (
                    <img src={previewImage} alt="Foto Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <UserCircle className="text-gray-400 mb-2" size={32} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Belum ada foto</span>
                    </>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Unggah foto resmi Kepala Sekolah. Foto akan ditampilkan di halaman Profil - Sambutan Kepala Sekolah. Format yang didukung: PNG, JPG (Maks: 2MB).
                  </p>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <button type="button" className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm">
                      <Upload size={18} /> Ganti Foto
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Pesan Sambutan */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Pesan Sambutan</h2>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Isi Pesan (Gunakan enter untuk paragraf baru)</label>
                <textarea 
                  value={formData.message} 
                  onChange={e => setFormData({...formData, message: e.target.value})} 
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y text-sm font-medium" 
                  required
                />
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
                    <Save size={18} /> Simpan Perubahan
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
