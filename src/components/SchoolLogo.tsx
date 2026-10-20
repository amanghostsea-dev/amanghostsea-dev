'use client';

import { useState, useEffect } from 'react';

export default function SchoolLogo({ logoUrl }: { logoUrl?: string | null }) {
  const logo = logoUrl;

  if (logo) {
    return (
      <img 
        src={logo} 
        alt="School Logo" 
        className="w-10 h-10 object-contain rounded-xl bg-white shadow-lg p-1 flex-shrink-0" 
      />
    );
  }

  return (
    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white overflow-hidden group">
      <div className="absolute inset-0 bg-white/30 blur-md rounded-full -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      <span className="relative z-10 drop-shadow-md tracking-tighter">G<span className="text-sm text-blue-200">M</span></span>
    </div>
  );
}
