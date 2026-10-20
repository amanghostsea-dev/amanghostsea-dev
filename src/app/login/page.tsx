'use client';

import { useState } from 'react';
import { loginAction } from './actions';
import { Lock, User, LogIn, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-bold text-3xl shadow-lg mx-auto mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold text-white">Sistem Terpadu</h1>
          <p className="text-blue-100 mt-1">Login Portal Sekolah</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form action={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
              <div className="relative">
                <input 
                  required 
                  type="text" 
                  name="username" 
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  placeholder="Masukkan username" 
                />
                <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input 
                  required 
                  type="password" 
                  name="password" 
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  placeholder="••••••••" 
                />
                <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2">
              {loading ? 'Memproses...' : <><LogIn size={20} /> Masuk ke Sistem</>}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
            <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              &larr; Kembali ke Beranda
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
