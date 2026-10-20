'use client';

import { useState } from 'react';
import type { Berita } from '@prisma/client';
import { Newspaper, Plus, Edit2, Trash2, X, Check, Search, Loader2 } from 'lucide-react';
import { createBerita, updateBerita, deleteBerita } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

export type BeritaItem = Berita & { date: string };

export default function BeritaClient({ initialBerita }: { initialBerita: BeritaItem[] }) {
  const [berita, setBerita] = useState<BeritaItem[]>(initialBerita || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', title: '', category: '', date: '', status: 'Draft' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BeritaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdd = () => {
    setFormData({ id: '', title: '', category: '', date: new Date().toISOString().split('T')[0], status: 'Draft' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: BeritaItem) => {
    setFormData({
      id: item.id,
      title: item.title,
      category: item.category,
      date: item.date,
      status: item.status
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBerita(deleteTarget.id);
      setBerita(berita.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus berita.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isEditing) {
      const res = await updateBerita(formData.id, formData);
      if (res.success) {
        setBerita(berita.map(b => b.id === formData.id ? {...res.data, date: res.data.createdAt.toISOString().split('T')[0]} : b));
      } else {
        alert(res.error);
      }
    } else {
      const res = await createBerita(formData);
      if (res.success) {
        setBerita([{...res.data, date: res.data.createdAt.toISOString().split('T')[0]}, ...berita]);
      } else {
        alert(res.error);
      }
    }
    
    setLoading(false);
    setIsModalOpen(false);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredBerita = berita.filter(item =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Newspaper className="text-blue-600 dark:text-blue-400" /> Manajemen Berita (CMS)
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola artikel, pengumuman, dan berita sekolah</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari berita..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" 
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            <button onClick={handleAdd} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/30">
              <Plus size={18} /> Tambah Berita
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 text-sm">
                  <th className="p-4 font-semibold">Judul Berita</th>
                  <th className="p-4 font-semibold">Kategori</th>
                  <th className="p-4 font-semibold">Tanggal</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredBerita.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Tidak ada berita ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredBerita.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="p-4 font-medium text-gray-900 dark:text-white">{item.title}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-semibold">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{item.date}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'Published' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteTarget(item)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer" title="Hapus"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg overflow-hidden text-gray-900 dark:text-white transition-all">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Berita' : 'Tambah Berita Baru'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Judul Berita</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    placeholder="Judul Berita atau Pengumuman"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Kategori</label>
                    <select 
                      required 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="">Pilih...</option>
                      <option value="Pengumuman">Pengumuman</option>
                      <option value="Prestasi">Prestasi</option>
                      <option value="Kegiatan">Kegiatan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tanggal</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status Publikasi</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors text-sm">Batal</button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 rounded-xl font-medium transition-all flex items-center gap-2 text-sm shadow-sm shadow-blue-600/30"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check size={18} /> Simpan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modern 3D Confirm Modal */}
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          title="Hapus Berita Ini?"
          message={
            <span>
              Apakah Anda yakin ingin menghapus artikel berita{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                "{deleteTarget?.title}"
              </strong>
              ? Artikel ini akan dihapus secara permanen dari website.
            </span>
          }
          confirmText="Ya, Hapus Berita"
          cancelText="Batalkan"
          variant="danger"
        />
      </div>
    </div>
  );
}
