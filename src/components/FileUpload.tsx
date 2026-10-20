'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X, Loader2, ExternalLink, Plus } from 'lucide-react';

interface UploadedFileItem {
  url: string;
  fileName: string;
  fileSize: string;
}

interface FileUploadProps {
  name: string;
  label: string;
  required?: boolean;
  accept?: string;
  value?: string;
  onChange?: (urlOrUrls: string) => void;
  colorTheme?: 'blue' | 'green' | 'purple';
  helperText?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export default function FileUpload({
  name,
  label,
  required = false,
  accept = '.pdf,.jpg,.jpeg,.png,.webp',
  value,
  onChange,
  colorTheme = 'blue',
  helperText = 'Format PDF, JPG, PNG, WEBP (Maks 4.5MB)',
  multiple = false,
  maxFiles = 10,
}: FileUploadProps) {
  // Single mode state
  const [fileUrl, setFileUrl] = useState<string>(!multiple ? (value || '') : '');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');

  // Multiple mode state
  const [fileList, setFileList] = useState<UploadedFileItem[]>(() => {
    if (multiple && value) {
      try {
        if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.map((u: string, idx: number) => ({
              url: u,
              fileName: `Berkas Prestasi ${idx + 1}`,
              fileSize: ''
            }));
          }
        }
      } catch {}
    }
    return [];
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themeColors = {
    blue: {
      borderHover: 'hover:border-blue-500',
      borderActive: 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
      button: 'text-blue-600 hover:text-blue-700 dark:text-blue-400',
      addBtn: 'border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400',
    },
    green: {
      borderHover: 'hover:border-green-500',
      borderActive: 'border-green-500 bg-green-50/50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
      button: 'text-green-600 hover:text-green-700 dark:text-green-400',
      addBtn: 'border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400',
    },
    purple: {
      borderHover: 'hover:border-purple-500',
      borderActive: 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20',
      icon: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
      button: 'text-purple-600 hover:text-purple-700 dark:text-purple-400',
      addBtn: 'border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400',
    },
  }[colorTheme];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const MAX_FILE_SIZE = 4.5 * 1024 * 1024;

  const handleUploadSingle = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`Ukuran file "${file.name}" (${formatFileSize(file.size)}) melebihi batas 4.5MB. Silakan gunakan file lebih kecil atau kompres terlebih dahulu.`);
      return;
    }

    setErrorMessage('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah berkas.');
      }

      setFileUrl(data.url);
      setFileName(data.fileName);
      setFileSize(formatFileSize(data.size));
      if (onChange) onChange(data.url);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadMultiple = async (files: File[]) => {
    if (fileList.length + files.length > maxFiles) {
      setErrorMessage(`Maksimal hanya dapat mengunggah ${maxFiles} berkas prestasi.`);
      return;
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`Berkas "${file.name}" (${formatFileSize(file.size)}) melebihi batas 4.5MB. Silakan kompres atau pilih berkas lain.`);
        return;
      }
    }

    setErrorMessage('');
    setIsUploading(true);
    const newItems: UploadedFileItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgressText(`Mengunggah berkas ${i + 1} dari ${files.length}...`);

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Gagal mengunggah ${file.name}`);
        }

        newItems.push({
          url: data.url,
          fileName: data.fileName || file.name,
          fileSize: formatFileSize(data.size || file.size),
        });
      }

      const updatedList = [...fileList, ...newItems];
      setFileList(updatedList);
      if (onChange) onChange(JSON.stringify(updatedList.map(f => f.url)));
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah sebagian berkas.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    if (multiple) {
      handleUploadMultiple(files);
    } else {
      handleUploadSingle(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length === 0) return;
    if (multiple) {
      handleUploadMultiple(files);
    } else {
      handleUploadSingle(files[0]);
    }
  };

  const handleRemoveSingle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileUrl('');
    setFileName('');
    setFileSize('');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onChange) onChange('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = fileList.filter((_, idx) => idx !== index);
    setFileList(updated);
    if (onChange) onChange(updated.length > 0 ? JSON.stringify(updated.map(f => f.url)) : '');
  };

  const hiddenInputValue = multiple
    ? (fileList.length > 0 ? JSON.stringify(fileList.map(f => f.url)) : '')
    : fileUrl;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-xs text-slate-400 font-medium">{helperText}</span>
      </div>

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
      />
      <input type="hidden" name={name} value={hiddenInputValue} />

      {/* MULTIPLE FILES MODE */}
      {multiple ? (
        <div className="space-y-3">
          {/* Uploaded File List */}
          {fileList.length > 0 && (
            <div className="space-y-2">
              {fileList.map((file, idx) => (
                <div
                  key={file.url + idx}
                  className="w-full p-3 border border-purple-200/90 rounded-2xl bg-gradient-to-r from-purple-50/70 via-white to-purple-50/30 shadow-sm flex items-center justify-between gap-3 transition-all hover:border-purple-300"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="overflow-hidden text-left">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {file.fileName || `Berkas Prestasi ${idx + 1}`}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {file.fileSize && <span>{file.fileSize}</span>}
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Terunggah
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-white shadow-sm transition-all"
                      title="Lihat Berkas"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white shadow-sm transition-all cursor-pointer"
                      title="Hapus Berkas Ini"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Uploading State for Multiple */}
          {isUploading && (
            <div className="w-full p-4 border-2 border-dashed border-purple-300 rounded-2xl bg-purple-50/60 flex items-center justify-center gap-3 shadow-inner my-2">
              <Loader2 className="animate-spin text-purple-600" size={22} />
              <div className="text-left">
                <p className="text-sm font-bold text-purple-800">
                  {uploadProgressText || 'Sedang mengunggah berkas...'}
                </p>
                <p className="text-xs text-purple-600">Mohon tunggu sebentar sampai selesai</p>
              </div>
            </div>
          )}

          {/* Add more button or initial Dropzone */}
          {fileList.length === 0 && !isUploading ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full p-4 sm:p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-150 active:scale-[0.98] select-none flex flex-col items-center justify-center text-center group shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 ${
                isDragging
                  ? themeColors.borderActive
                  : `border-slate-300/80 bg-slate-50/60 hover:bg-white ${themeColors.borderHover}`
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-200/70 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <UploadCloud className={`text-slate-400 group-hover:${themeColors.icon}`} size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-700 group-hover:text-purple-600 transition-colors">
                Klik untuk pilih berkas prestasi (bisa pilih beberapa file sekaligus)
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, JPG, JPEG, PNG, atau WEBP (Maks {maxFiles} berkas)</p>
            </div>
          ) : fileList.length > 0 && fileList.length < maxFiles && !isUploading ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-2.5 px-4 rounded-xl border border-dashed ${themeColors.addBtn} text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.98] select-none flex items-center justify-center gap-2 cursor-pointer shadow-sm`}
            >
              <Plus size={16} />
              <span>+ Tambah Berkas / Sertifikat Prestasi Lainnya ({fileList.length}/{maxFiles})</span>
            </button>
          ) : null}
        </div>
      ) : (
        /* SINGLE FILE MODE */
        <>
          {/* File Upload Box */}
          {!fileUrl && !isUploading && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full p-4 sm:p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-150 active:scale-[0.98] select-none flex flex-col items-center justify-center text-center group shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 ${
                isDragging
                  ? themeColors.borderActive
                  : `border-slate-300/80 bg-slate-50/60 hover:bg-white ${themeColors.borderHover}`
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-200/70 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <UploadCloud className={`text-slate-400 group-hover:${themeColors.icon}`} size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                Klik untuk pilih file atau seret ke sini
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, JPG, JPEG, PNG, atau WEBP</p>
            </div>
          )}

          {/* Uploading State */}
          {isUploading && (
            <div className="w-full p-5 border-2 border-dashed border-blue-300 rounded-2xl bg-blue-50/50 flex items-center justify-center gap-3 shadow-inner">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <div className="text-left">
                <p className="text-sm font-bold text-blue-700">Sedang mengunggah berkas...</p>
                <p className="text-xs text-blue-500">Mohon tunggu sebentar</p>
              </div>
            </div>
          )}

          {/* Uploaded Success State */}
          {fileUrl && !isUploading && (
            <div className="w-full p-3.5 border border-emerald-200 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-white shadow-sm flex items-center justify-between gap-3 transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 size={22} />
                </div>
                <div className="overflow-hidden text-left">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {fileName || 'Berkas Terlampir'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {fileSize && <span>{fileSize}</span>}
                    <span className="text-emerald-600 font-semibold">• Siap dikirim</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-white shadow-sm transition-all"
                  title="Lihat Berkas"
                >
                  <ExternalLink size={18} />
                </a>
                <button
                  type="button"
                  onClick={handleRemoveSingle}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-white shadow-sm transition-all"
                  title="Hapus / Ganti Berkas"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto underline font-medium hover:text-red-700"
          >
            Coba lagi
          </button>
        </div>
      )}
    </div>
  );
}
