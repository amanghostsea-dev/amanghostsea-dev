'use client';

import { useState } from 'react';
import type { User } from '@prisma/client';
import { Users, Plus, Edit2, Trash2, X, Check, Search, Shield, Briefcase, CheckSquare, Loader2 } from 'lucide-react';
import { createUser, updateUser, deleteUser } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

export default function UsersCRUD({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', username: '', role: '', status: 'Aktif', password: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdd = () => {
    setFormData({ id: '', name: '', username: '', role: '', status: 'Aktif', password: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: User) => {
    setFormData({ ...item, password: '' });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteUser(deleteTarget.id);
      if (res?.success) {
        setUsers(users.filter(u => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(res?.error || 'Gagal menghapus pengguna.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        const res = await updateUser(formData.id, formData);
        if (res?.success && res.data) {
          setUsers(users.map(u => u.id === formData.id ? res.data : u));
        } else if (res?.error) {
          alert(res.error);
          return;
        }
      } else {
        const res = await createUser(formData);
        if (res?.success && res.data) {
          setUsers([res.data, ...users]);
        } else if (res?.error) {
          alert(res.error);
          return;
        }
      }
      setIsModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = (users || []).filter((item: User) =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-600 dark:text-indigo-400" /> Manajemen Akun (Users)
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola data login siswa, guru, dan administrator</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama/username..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all" 
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            <button onClick={handleAdd} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/30">
              <Plus size={18} /> Tambah Pengguna
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 text-sm">
                  <th className="p-4 font-semibold">Nama Lengkap</th>
                  <th className="p-4 font-semibold">Username</th>
                  <th className="p-4 font-semibold">Password</th>
                  <th className="p-4 font-semibold">Role (Peran)</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Tidak ada pengguna ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item: User) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="p-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">{item.username}</td>
                      <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                        {item.password}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {item.role === 'Super Admin' && <Shield size={14} className="text-red-500"/>}
                          {item.role === 'Admin BKK' && <Briefcase size={14} className="text-amber-500"/>}
                          {item.role === 'Panitia PPDB' && <CheckSquare size={14} className="text-blue-500"/>}
                          {item.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'Aktif' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
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
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium" 
                    placeholder="Nama Lengkap User"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Username Login</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.username} 
                      onChange={e => setFormData({...formData, username: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" 
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Password
                    </label>
                    <input 
                      type="text" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      placeholder={isEditing ? 'Biarkan kosong jika tidak diubah' : 'Kosong = default'} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role (Peran)</label>
                    <select 
                      required 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="">Pilih...</option>
                      <option value="Siswa">Siswa</option>
                      <option value="Guru">Guru</option>
                      <option value="Panitia PPDB">Panitia PPDB</option>
                      <option value="Admin BKK">Admin BKK</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status Akun</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors text-sm">Batal</button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 rounded-xl font-medium transition-all flex items-center gap-2 text-sm shadow-sm shadow-indigo-600/30"
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
          title="Hapus Akun Pengguna?"
          message={
            <span>
              Apakah Anda yakin ingin menghapus akun pengguna{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                {deleteTarget?.name} (@{deleteTarget?.username})
              </strong>
              ? Pengguna ini tidak akan dapat login lagi ke dalam sistem.
            </span>
          }
          confirmText="Ya, Hapus Akun"
          cancelText="Batalkan"
          variant="danger"
        />
      </div>
    </div>
  );
}
