'use client';

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 text-sm cursor-pointer"
    >
      <Printer size={18} /> Cetak Bukti Registrasi (PDF/Print)
    </button>
  );
}
