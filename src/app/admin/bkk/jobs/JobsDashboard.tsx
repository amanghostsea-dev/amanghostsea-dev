'use client';

import { useState } from 'react';
import { Briefcase, Building2, MapPin, DollarSign, Clock, Search, Trash2, Edit, X, Check, Loader2 } from 'lucide-react';
import { createJob, updateJob, deleteJob } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  type: string;
  description: string;
  tags: string;
  isHot: boolean;
};

export default function JobsDashboard({ initialJobs }: { initialJobs: JobListing[] }) {
  const [jobs, setJobs] = useState<JobListing[]>(initialJobs || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<any>({
    id: '', title: '', company: '', location: '', salary: '', type: 'Full-time', description: '', tags: '', isHot: false
  });

  const filteredJobs = (jobs || []).filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setFormData({ id: '', title: '', company: '', location: '', salary: '', type: 'Full-time', description: '', tags: '', isHot: false });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (job: JobListing) => {
    setFormData(job);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteJob(deleteTarget.id);
      if (res?.success) {
        setJobs(jobs.filter(j => j.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(res?.error || 'Gagal menghapus lowongan.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus lowongan.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        const res = await updateJob(formData.id, formData);
        if (res?.success && res.data) {
          setJobs(jobs.map(j => j.id === formData.id ? res.data : j));
        } else if (res?.error) {
          alert(res.error);
          return;
        }
      } else {
        const res = await createJob(formData);
        if (res?.success && res.data) {
          setJobs([res.data, ...jobs]);
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

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari posisi atau perusahaan..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={handleAdd} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap">
          + Tambah Lowongan
        </button>
      </div>

      {/* Jobs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map((job) => (
          <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col relative overflow-hidden group">
            {job.isHot && (
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                HOT
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl flex-shrink-0">
                {job.company.charAt(0)}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(job)} className="p-1.5 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">
                  <Edit size={16} />
                </button>
                <button onClick={() => setDeleteTarget(job)} className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-gray-600 rounded cursor-pointer" title="Hapus">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{job.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm mb-4 line-clamp-1">{job.company}</p>

            <div className="space-y-2 mb-6 flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <MapPin size={16} className="text-gray-400" /> {job.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <DollarSign size={16} className="text-gray-400" /> {job.salary || 'Menyesuaikan'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock size={16} className="text-gray-400" /> {job.type}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              {job.tags.split(',').map((tag, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        ))}
        
        {filteredJobs.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Briefcase className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg">Tidak ada data lowongan ditemukan.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Lowongan' : 'Tambah Lowongan Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul Pekerjaan</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perusahaan</label>
                  <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasi</label>
                  <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gaji (Opsional)</label>
                  <input type="text" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Rp 5.000.000 - Rp 8.000.000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe Pekerjaan</label>
                  <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Kontrak">Kontrak</option>
                    <option value="Magang">Magang</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (Pisahkan dengan koma)</label>
                  <input required type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="React, Node.js, Frontend" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi Pekerjaan</label>
                <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isHot" checked={formData.isHot} onChange={e => setFormData({...formData, isHot: e.target.checked})} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                <label htmlFor="isHot" className="text-sm font-medium text-gray-700 dark:text-gray-300">Tandai sebagai lowongan HOT</label>
              </div>
              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
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
        title="Hapus Lowongan Kerja?"
        message={
          <span>
            Apakah Anda yakin ingin menghapus lowongan{' '}
            <strong className="text-slate-900 dark:text-white font-bold">
              {deleteTarget?.title} di {deleteTarget?.company}
            </strong>
            ? Lowongan ini tidak akan ditampilkan lagi di portal bursa kerja alumni.
          </span>
        }
        confirmText="Ya, Hapus Lowongan"
        cancelText="Batalkan"
        variant="danger"
      />
    </div>
  );
}
