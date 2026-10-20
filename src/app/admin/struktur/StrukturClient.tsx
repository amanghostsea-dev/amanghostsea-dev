'use client';

import { useState } from 'react';
import { Network, Plus, Trash2, Edit, Save, X, Upload, Check } from 'lucide-react';
import { OrgNode } from '@/components/OrgChart';

const generateId = () => Math.random().toString(36).substr(2, 9);

import { saveStrukturData } from './actions';
import ConfirmModal from '@/components/ConfirmModal';

export default function StrukturClient(props: { initialData: any }) {
  const defaultData: OrgNode = {
    id: "1",
    name: "Dr. H. Budi Santoso, M.Pd",
    title: "Kepala Sekolah",
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop",
    bio: "Lahir di Jakarta, 15 Agustus 1975. Memiliki pengalaman di bidang manajemen pendidikan vokasi lebih dari 15 tahun.",
    children: []
  };

  const [data, setData] = useState<OrgNode>(props.initialData || defaultData);
  
  // State for Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    title: '',
    photoUrl: '',
    bio: ''
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const saveToStorage = async (newData: OrgNode) => {
    setData(newData);
    const res = await saveStrukturData(newData);
    if (res.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      alert(res.error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
        setFormData({ ...formData, photoUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = (parentId: string) => {
    setActiveParentId(parentId);
    setIsEditing(false);
    setFormData({ id: generateId(), name: '', title: '', photoUrl: '', bio: '' });
    setPreviewImage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (node: OrgNode) => {
    setIsEditing(true);
    setFormData({
      id: node.id,
      name: node.name,
      title: node.title,
      photoUrl: node.photoUrl,
      bio: node.bio
    });
    setPreviewImage(node.photoUrl);
    setIsModalOpen(true);
  };

  // Helper to deep clone and update node
  const updateNodeInTree = (node: OrgNode, targetId: string, updatedData: Partial<OrgNode>): OrgNode => {
    if (node.id === targetId) {
      return { ...node, ...updatedData };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateNodeInTree(child, targetId, updatedData))
      };
    }
    return node;
  };

  // Helper to add child
  const addChildToTree = (node: OrgNode, targetParentId: string, newChild: OrgNode): OrgNode => {
    if (node.id === targetParentId) {
      return { ...node, children: [...(node.children || []), newChild] };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => addChildToTree(child, targetParentId, newChild))
      };
    }
    return node;
  };

  // Helper to remove node
  const removeNodeFromTree = (node: OrgNode, targetId: string): OrgNode | null => {
    if (node.id === targetId) return null; // Can't delete root here usually, handled separately
    if (node.children) {
      return {
        ...node,
        children: node.children
          .map(child => removeNodeFromTree(child, targetId))
          .filter(child => child !== null) as OrgNode[]
      };
    }
    return node;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    if (isEditing) {
      const updatedTree = updateNodeInTree(data, formData.id, {
        name: formData.name,
        title: formData.title,
        photoUrl: formData.photoUrl,
        bio: formData.bio
      });
      saveToStorage(updatedTree);
    } else if (activeParentId) {
      const newNode: OrgNode = {
        id: formData.id,
        name: formData.name,
        title: formData.title,
        photoUrl: formData.photoUrl,
        bio: formData.bio,
        children: []
      };
      const updatedTree = addChildToTree(data, activeParentId, newNode);
      saveToStorage(updatedTree);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (targetId: string) => {
    if (!data) return;
    if (data.id === targetId) {
      alert("Tidak dapat menghapus pimpinan tertinggi.");
      return;
    }
    setDeleteTargetId(targetId);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId || !data) return;
    const updatedTree = removeNodeFromTree(data, deleteTargetId);
    if (updatedTree) saveToStorage(updatedTree);
    setDeleteTargetId(null);
  };

  // Recursive render for Admin View
  const renderAdminNode = (node: OrgNode) => {
    return (
      <div key={node.id} className="ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 py-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-2">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
              {node.photoUrl ? (
                <img src={node.photoUrl} alt={node.name} className="w-full h-full object-cover" />
              ) : (
                <Network className="w-6 h-6 text-gray-400 m-3" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{node.name}</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{node.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openAddModal(node.id)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors tooltip" title="Tambah Bawahan">
              <Plus size={18} />
            </button>
            <button onClick={() => openEditModal(node)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors tooltip" title="Edit Profil">
              <Edit size={18} />
            </button>
            {node.id !== data?.id && (
              <button onClick={() => handleDelete(node.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors tooltip" title="Hapus">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
        
        {/* Render children recursively */}
        {node.children && node.children.length > 0 && (
          <div className="mt-2">
            {node.children.map(child => renderAdminNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Network className="text-gray-600" /> Kelola Struktur Organisasi
            </h1>
            <p className="text-gray-500 text-sm">Atur bagan organisasi yang ditampilkan di halaman publik secara interaktif</p>
          </div>
        </div>

        {isSaved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <Check size={18} /> Struktur berhasil diperbarui!
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {data ? (
            <div className="-ml-4">
              {renderAdminNode(data)}
            </div>
          ) : (
            <p>Memuat struktur...</p>
          )}
        </div>

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white transition-all">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Profil' : 'Tambah Struktur Bawahan'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                  placeholder="Nama Lengkap & Gelar"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Jabatan / Posisi</label>
                <input 
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" 
                  placeholder="Contoh: Wakasek Kurikulum"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Upload Foto</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                    {previewImage && <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />}
                  </div>
                  <div className="relative">
                    <input 
                      type="file" accept="image/*" onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <button type="button" className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors shadow-sm">
                      <Upload size={16} /> Pilih Foto
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Biodata / Deskripsi Tugas</label>
                <textarea 
                  value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium resize-none" 
                  placeholder="Deskripsi tugas atau peranan..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors text-sm">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors text-sm shadow-sm shadow-blue-600/30">
                  <Save size={18} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern 3D Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Bagian Struktur?"
        message="Apakah Anda yakin ingin menghapus bagian struktur organisasi ini beserta seluruh bawahannya? Tindakan ini bersifat permanen."
        confirmText="Ya, Hapus Bagian"
        cancelText="Batalkan"
        variant="danger"
      />
    </div>
  );
}
