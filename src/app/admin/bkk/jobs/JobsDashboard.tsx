'use client';

import { useState } from 'react';
import { 
  Briefcase, Building2, MapPin, DollarSign, Clock, Search, 
  Trash2, Edit, X, Check, Loader2, Users, FileText, ExternalLink, 
  Phone, Mail, MessageSquare, Download, Filter, Eye, CheckCircle2, 
  XCircle, AlertCircle, Sparkles
} from 'lucide-react';
import { createJob, updateJob, deleteJob, updateApplicationStatus, deleteApplication } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  type: string;
  description: string;
  requirements?: string | null;
  tags: string;
  department?: string | null;
  contactEmail?: string | null;
  contactWa?: string | null;
  isHot: boolean;
  _count?: {
    applications: number;
  };
};

type JobApplication = {
  id: string;
  jobId: string;
  job: {
    id?: string;
    title: string;
    company: string;
  };
  fullName: string;
  email: string;
  phone: string;
  nisn: string | null;
  lastEducation: string | null;
  graduationYear: number | null;
  resumeUrl: string | null;
  portfolioUrl: string | null;
  coverLetter: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: Date | string;
};

export default function JobsDashboard({ 
  initialJobs, 
  initialApplications = [] 
}: { 
  initialJobs: any[], 
  initialApplications?: any[] 
}) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'applicants'>('jobs');
  const [jobs, setJobs] = useState<JobListing[]>(initialJobs || []);
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [applicantFilterJob, setApplicantFilterJob] = useState('ALL');
  const [applicantFilterStatus, setApplicantFilterStatus] = useState('ALL');
  
  // Modal states for Jobs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal states for Applicant Detail
  const [selectedApplicant, setSelectedApplicant] = useState<JobApplication | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [formData, setFormData] = useState<any>({
    id: '', 
    title: '', 
    company: '', 
    location: '', 
    salary: '', 
    type: 'Full-time', 
    department: 'Semua Jurusan',
    description: '', 
    requirements: '',
    tags: '', 
    contactEmail: '',
    contactWa: '',
    isHot: false
  });

  const filteredJobs = (jobs || []).filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.tags.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApplicants = applications.filter(app => {
    const matchesJob = applicantFilterJob === 'ALL' || app.jobId === applicantFilterJob;
    const matchesStatus = applicantFilterStatus === 'ALL' || app.status === applicantFilterStatus;
    const matchesSearch = 
      app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.includes(searchTerm) ||
      app.job?.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesJob && matchesStatus && matchesSearch;
  });

  const handleAdd = () => {
    setFormData({ 
      id: '', 
      title: '', 
      company: '', 
      location: '', 
      salary: '', 
      type: 'Full-time', 
      department: 'Semua Jurusan',
      description: '', 
      requirements: '',
      tags: '', 
      contactEmail: '',
      contactWa: '',
      isHot: false 
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (job: JobListing) => {
    setFormData({
      ...job,
      requirements: job.requirements || '',
      department: job.department || 'Semua Jurusan',
      contactEmail: job.contactEmail || '',
      contactWa: job.contactWa || ''
    });
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
        setApplications(applications.filter(a => a.jobId !== deleteTarget.id));
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
          setJobs(jobs.map(j => j.id === formData.id ? { ...res.data, _count: j._count } : j));
        } else if (res?.error) {
          alert(res.error);
          return;
        }
      } else {
        const res = await createJob(formData);
        if (res?.success && res.data) {
          setJobs([{ ...res.data, _count: { applications: 0 } }, ...jobs]);
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

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await updateApplicationStatus(appId, newStatus);
      if (res?.success) {
        setApplications(applications.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        if (selectedApplicant?.id === appId) {
          setSelectedApplicant({ ...selectedApplicant, status: newStatus });
        }
      } else {
        alert(res?.error || 'Gagal memperbarui status');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openWhatsAppInterview = (app: JobApplication) => {
    const cleanPhone = app.phone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const text = encodeURIComponent(
      `Halo ${app.fullName},\n\nKami dari BKK & Tim Rekrutmen ${app.job.company}. Terkait berkas lamaran Anda untuk posisi *${app.job.title}*, kami mengundang Anda untuk mengikuti tahapan wawancara/seleksi lanjutan.\n\nApakah Anda bersedia untuk koordinasi jadwal interview?\nTerima kasih.`
    );
    window.open(`https://wa.me/${waPhone}?text=${text}`, '_blank');
  };

  const exportApplicantsCSV = () => {
    if (applications.length === 0) {
      alert('Tidak ada data pelamar untuk diekspor.');
      return;
    }
    const headers = ['ID Lamaran', 'Nama Lengkap', 'Lowongan', 'Perusahaan', 'Email', 'No WA', 'NISN', 'Jurusan', 'Status', 'Tanggal Melamar'];
    const rows = applications.map(a => [
      a.id,
      `"${a.fullName}"`,
      `"${a.job?.title || '-'}"`,
      `"${a.job?.company || '-'}"`,
      a.email,
      a.phone,
      a.nisn || '-',
      `"${a.lastEducation || '-'}"`,
      a.status,
      new Date(a.createdAt).toLocaleDateString('id-ID')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Pelamar_BKK_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-8">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-4 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'jobs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Briefcase size={18} />
          Lowongan Pekerjaan ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('applicants')}
          className={`pb-4 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'applicants'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Users size={18} />
          Pelamar Masuk ({applications.length})
          {applications.filter(a => a.status === 'PENDING').length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-500 text-white font-bold rounded-full">
              {applications.filter(a => a.status === 'PENDING').length} Baru
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: LOWONGAN PEKERJAAN */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Cari posisi, keahlian, atau perusahaan..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={handleAdd} 
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              + Buat Lowongan Baru
            </button>
          </div>

          {/* Jobs List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div 
                key={job.id} 
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative overflow-hidden group hover:shadow-lg transition-all"
              >
                {job.isHot && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-bl-xl shadow-sm">
                    HOT LOKER
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-extrabold text-xl flex-shrink-0">
                    {job.company.charAt(0)}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(job)} 
                      className="p-2 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Edit Lowongan"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => setDeleteTarget(job)} 
                      className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors" 
                      title="Hapus Lowongan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{job.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 font-semibold text-sm mb-3 line-clamp-1">{job.company}</p>

                <div className="space-y-2 mb-4 flex-1 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" /> {job.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-gray-400" /> {job.salary || 'Sesuai UMR / Nego'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" /> {job.type} • {job.department || 'Semua Jurusan'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-auto">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                    <Users size={14} />
                    {job._count?.applications ?? 0} Pelamar Masuk
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('applicants');
                      setApplicantFilterJob(job.id);
                    }}
                    className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 underline"
                  >
                    Tinjau Berkas &rarr;
                  </button>
                </div>
              </div>
            ))}
            
            {filteredJobs.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <Briefcase className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-lg font-bold text-gray-700 dark:text-gray-300">Belum ada lowongan yang cocok</p>
                <p className="text-sm">Klik "+ Buat Lowongan Baru" untuk menambahkan peluang karir untuk siswa.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PELAMAR MASUK (ATS MINI) */}
      {activeTab === 'applicants' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari nama, email, no HP..." 
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                value={applicantFilterJob}
                onChange={(e) => setApplicantFilterJob(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="ALL">Semua Lowongan</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title} ({j.company})</option>
                ))}
              </select>

              <select 
                value={applicantFilterStatus}
                onChange={(e) => setApplicantFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">PENDING (Menunggu Tinjauan)</option>
                <option value="REVIEWED">REVIEWED (Sudah Dilihat)</option>
                <option value="INTERVIEW">INTERVIEW (Dipanggil)</option>
                <option value="ACCEPTED">ACCEPTED (Diterima)</option>
                <option value="REJECTED">REJECTED (Ditolak)</option>
              </select>
            </div>

            <button 
              onClick={exportApplicantsCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Download size={16} /> Ekspor Data Pelamar (.CSV)
            </button>
          </div>

          {/* Applicants Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase text-xs font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Kandidat</th>
                    <th className="py-3 px-4">Posisi & Perusahaan</th>
                    <th className="py-3 px-4">Pendidikan & NISN</th>
                    <th className="py-3 px-4">Status Seleksi</th>
                    <th className="py-3 px-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {filteredApplicants.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{app.fullName}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>{app.phone}</span>
                          <span>•</span>
                          <span>{app.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{app.job?.title || 'Lowongan Dihapus'}</div>
                        <div className="text-xs text-gray-500">{app.job?.company}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{app.lastEducation || 'Alumni SMK'}</div>
                        <div className="text-xs text-gray-400">NISN: {app.nisn || '-'} • Lulus {app.graduationYear || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full outline-none border cursor-pointer ${
                            app.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                              : app.status === 'REVIEWED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                              : app.status === 'INTERVIEW'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                              : app.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="REVIEWED">Di-review</option>
                          <option value="INTERVIEW">Interview</option>
                          <option value="ACCEPTED">Diterima</option>
                          <option value="REJECTED">Ditolak</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedApplicant(app)}
                            className="p-1.5 bg-gray-100 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 hover:text-blue-600 dark:text-gray-300 rounded-lg transition-colors"
                            title="Buka Berkas & Detail"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openWhatsAppInterview(app)}
                            className="p-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors"
                            title="Undang Interview via WhatsApp"
                          >
                            <Phone size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredApplicants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
                        Belum ada berkas pelamar yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* APPLICANT DETAIL MODAL */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Detail Berkas Pelamar</h3>
                <p className="text-xs text-gray-500">ID Lamaran: {selectedApplicant.id}</p>
              </div>
              <button 
                onClick={() => setSelectedApplicant(null)} 
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Nama Lengkap</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedApplicant.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Posisi yang Dilamar</p>
                  <p className="font-bold text-blue-600">{selectedApplicant.job?.title} ({selectedApplicant.job?.company})</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">WhatsApp</p>
                  <p className="text-gray-800 dark:text-gray-200">{selectedApplicant.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email</p>
                  <p className="text-gray-800 dark:text-gray-200">{selectedApplicant.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">NISN / Asal Sekolah</p>
                  <p className="text-gray-800 dark:text-gray-200">{selectedApplicant.nisn || '-'} ({selectedApplicant.lastEducation || 'SMK'})</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Tahun Kelulusan</p>
                  <p className="text-gray-800 dark:text-gray-200">{selectedApplicant.graduationYear || '-'}</p>
                </div>
              </div>

              {/* Cover Letter */}
              {selectedApplicant.coverLetter && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Surat Pengantar / Motivasi</h4>
                  <div className="bg-gray-50 dark:bg-gray-800/70 p-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {selectedApplicant.coverLetter}
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Berkas Lampiran</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedApplicant.resumeUrl ? (
                    <a 
                      href={selectedApplicant.resumeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
                    >
                      <FileText size={16} /> Pratinjau Dokumen CV (PDF)
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Tidak melampirkan file CV</span>
                  )}

                  {selectedApplicant.portfolioUrl && (
                    <a 
                      href={selectedApplicant.portfolioUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors"
                    >
                      <ExternalLink size={16} /> Portofolio / LinkedIn
                    </a>
                  )}
                </div>
              </div>

              {/* Update Status Actions */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Tentukan Status Seleksi</h4>
                <div className="flex flex-wrap gap-2">
                  {['PENDING', 'REVIEWED', 'INTERVIEW', 'ACCEPTED', 'REJECTED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedApplicant.id, st)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedApplicant.status === st
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
              <button
                onClick={() => openWhatsAppInterview(selectedApplicant)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <Phone size={16} /> Hubungi via WhatsApp
              </button>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT JOB MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800 animate-in fade-in">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Informasi Lowongan' : 'Tambah Lowongan Kerja Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Judul Pekerjaan *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Contoh: Junior Web Developer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Perusahaan Mitra *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.company} 
                    onChange={e => setFormData({...formData, company: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="PT Telkom / Astra / dsb"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Lokasi Kerja *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Jakarta / Bandung / Remote"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Estimasi Gaji (Opsional)</label>
                  <input 
                    type="text" 
                    value={formData.salary || ''} 
                    onChange={e => setFormData({...formData, salary: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Rp 4.500.000 - Rp 7.000.000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tipe Kontrak</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Magang">Magang / PKL</option>
                    <option value="Kontrak">Kontrak</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Jurusan / Bidang Terkait</label>
                  <input 
                    type="text" 
                    value={formData.department || ''} 
                    onChange={e => setFormData({...formData, department: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="RPL, TKJ, Otomotif, Akuntansi, atau Semua Jurusan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">No. WhatsApp HRD (Untuk Quick Chat)</label>
                  <input 
                    type="text" 
                    value={formData.contactWa || ''} 
                    onChange={e => setFormData({...formData, contactWa: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="081234567890"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Resmi HRD</label>
                  <input 
                    type="email" 
                    value={formData.contactEmail || ''} 
                    onChange={e => setFormData({...formData, contactEmail: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="recruitment@perusahaan.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tags Keahlian (Pisahkan dengan koma) *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.tags} 
                  onChange={e => setFormData({...formData, tags: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="React, Next.js, TypeScript, Tailwind"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Deskripsi & Tanggung Jawab *</label>
                <textarea 
                  required 
                  rows={3} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Uraikan tugas harian dan profil pekerjaan..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Kualifikasi & Persyaratan (Opsional)</label>
                <textarea 
                  rows={3} 
                  value={formData.requirements || ''} 
                  onChange={e => setFormData({...formData, requirements: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="1. Lulusan SMK jurusan terkait&#10;2. Menguasai dasar-dasar pemrograman&#10;3. Siap ditempatkan di..."
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-xl">
                <input 
                  type="checkbox" 
                  id="isHot" 
                  checked={formData.isHot} 
                  onChange={e => setFormData({...formData, isHot: e.target.checked})} 
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <label htmlFor="isHot" className="text-xs font-bold text-orange-800 dark:text-orange-300 cursor-pointer">
                  Tandai sebagai Lowongan HOT (Tampil di urutan teratas & ada badge khusus)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-md disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Simpan Lowongan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
            ? Seluruh data berkas pelamar terkait juga akan dihapus.
          </span>
        }
        confirmText="Ya, Hapus Lowongan"
        cancelText="Batalkan"
        variant="danger"
      />
    </div>
  );
}
