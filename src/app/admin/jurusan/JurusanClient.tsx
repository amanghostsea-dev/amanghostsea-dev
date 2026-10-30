'use client';

import { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, Check, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { createJurusan, updateJurusan, deleteJurusan } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

export default function JurusanClient({ initialJurusan }: { initialJurusan: any[] }) {
  const [jurusan, setJurusan] = useState(initialJurusan);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', description: '', kuota: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdd = () => {
    setFormData({ id: '', name: '', code: '', description: '', kuota: 0 });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setFormData({
      id: item.id,
      name: item.name,
      code: item.code,
      description: item.description,
      kuota: item.kuota
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteJurusan(deleteTarget.id);
    if (res.success) {
      setJurusan(jurusan.filter(j => j.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      alert(res.error || 'Gagal menghapus jurusan.');
    }
    setIsDeleting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isEditing) {
      const res = await updateJurusan(formData.id, formData);
      if (res.success) {
        setJurusan(jurusan.map(j => j.id === formData.id ? res.data : j));
      } else {
        alert(res.error);
      }
    } else {
      const res = await createJurusan(formData);
      if (res.success) {
        setJurusan([res.data, ...jurusan]);
      } else {
        alert(res.error);
      }
    }
    
    setLoading(false);
    setIsModalOpen(false);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredJurusan = jurusan.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="text-green-600" /> Manajemen Jurusan
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola program keahlian dan kuota penerimaan siswa</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari jurusan..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 outline-none text-sm transition-all" 
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            <button onClick={handleAdd} className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-sm shadow-green-600/30">
              <Plus size={18} /> Tambah Jurusan
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 text-sm">
                  <th className="p-4 font-semibold">Nama Jurusan</th>
                  <th className="p-4 font-semibold">Kode Singkatan</th>
                  <th className="p-4 font-semibold">Deskripsi Singkat</th>
                  <th className="p-4 font-semibold">Kuota Siswa</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredJurusan.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Tidak ada data jurusan ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredJurusan.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="p-4 font-bold text-gray-900 dark:text-white">{item.name}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/60 rounded-full text-xs font-bold">
                          {item.code}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400 text-sm max-w-xs truncate">{item.description}</td>
                      <td className="p-4 font-medium text-gray-700 dark:text-gray-300">{item.kuota} Kursi</td>
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

        {/* Modal Tambah / Edit Jurusan */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg overflow-hidden text-gray-900 dark:text-white transition-all">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nama Program Keahlian</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm font-medium" 
                    placeholder="Cth: Teknik Komputer dan Jaringan" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Kode Singkatan</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.code} 
                      onChange={e => setFormData({...formData, code: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm font-medium" 
                      placeholder="Cth: TJKT, RPL, DKV, MPLB" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Kuota PPDB</label>
                    <input 
                      required 
                      type="number" 
                      value={formData.kuota} 
                      onChange={e => setFormData({...formData, kuota: Number(e.target.value)})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm font-medium" 
                      min="0" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Deskripsi Jurusan</label>
                  <textarea 
                    required 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm font-medium h-28 resize-none" 
                    placeholder="Penjelasan singkat mengenai jurusan ini..." 
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors text-sm">Batal</button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="px-5 py-2.5 text-white bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 rounded-xl font-medium transition-all flex items-center gap-2 text-sm shadow-sm shadow-green-600/30"
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
          title="Hapus Jurusan Ini?"
          message={
            <span>
              Apakah Anda yakin ingin menghapus program keahlian{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                {deleteTarget?.name} ({deleteTarget?.code})
              </strong>
              ? Data ini akan dihapus secara permanen dari sistem dan formulir pendaftaran PPDB.
            </span>
          }
          confirmText="Ya, Hapus Jurusan"
          cancelText="Batalkan"
          variant="danger"
        />
      </div>
    </div>
  );
}
