'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  HelpCircle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check 
} from 'lucide-react';

interface CbtMathToolbarProps {
  onInsert: (snippet: string) => void;
  targetLabel?: string;
}

interface FormulaItem {
  label: string;
  display: string;
  latex: string;
  desc: string;
}

const COMMON_FORMULAS: FormulaItem[] = [
  { label: 'Pecahan', display: 'a/b', latex: '\\frac{a}{b}', desc: 'Pecahan bertingkat pembilang/penyebut' },
  { label: 'Pangkat', display: 'x²', latex: 'x^{2}', desc: 'Eksponen / Pangkat atas' },
  { label: 'Pangkat -n', display: 'x⁻ⁿ', latex: 'x^{-n}', desc: 'Pangkat bilangan negatif (misal x⁻³)' },
  { label: 'Kurung Pangkat', display: '(a/b)ⁿ', latex: '\\left(\\frac{a}{b}\\right)^{n}', desc: 'Kurung besar proporsional berpangkat n' },
  { label: 'Akar', display: '√x', latex: '\\sqrt{x}', desc: 'Akar kuadrat' },
  { label: 'Akar Pecahan', display: '√(a/b)', latex: '\\sqrt{\\frac{a}{b}}', desc: 'Akar kuadrat dari pecahan' },
  { label: 'Akar Kurung ⁿ', display: '(√a/b)ⁿ', latex: '\\left(\\sqrt{\\frac{a}{b}}\\right)^{n}', desc: 'Akar pecahan dalam kurung berpangkat n' },
  { label: 'Akar n', display: 'ⁿ√x', latex: '\\sqrt[n]{x}', desc: 'Akar pangkat n' },
  { label: 'Indeks', display: 'x₁', latex: 'x_{1}', desc: 'Subskrip / Indeks bawah' },
  { label: 'Kali', display: '×', latex: '\\times', desc: 'Tanda kali silang' },
  { label: 'Bagi', display: '÷', latex: '\\div', desc: 'Tanda bagi titik dua' },
  { label: 'PlusMinus', display: '±', latex: '\\pm', desc: 'Kurang atau lebih' },
  { label: 'Derajat', display: '°', latex: '^{\\circ}', desc: 'Derajat sudut atau suhu' },
  { label: 'Pi', display: 'π', latex: '\\pi', desc: 'Konstanta lingkaran 3.14' },
];

const ADVANCED_FORMULAS: { category: string; items: FormulaItem[] }[] = [
  {
    category: '📐 Aljabar, Eksponen & Bentuk Akar',
    items: [
      { label: 'Pecahan Pangkat Negatif', display: '4a⁵ / 2a⁻³', latex: '\\frac{4a^5}{2a^{-3}}', desc: 'Contoh aljabar pecahan dengan eksponen negatif' },
      { label: 'Pecahan Multi-Variabel', display: 'x⁷ 10y⁵ / 9x⁻³y⁻²', latex: '\\frac{x^7 10y^5}{9x^{-3}y^{-2}}', desc: 'Pecahan variabel x dan y dengan pangkat campuran' },
      { label: 'Kurung Pangkat Pecahan', display: '(3k²/5l³)¹/⁶', latex: '\\left(\\frac{3k^2}{5l^3}\\right)^{1/6}', desc: 'Pecahan aljabar di dalam kurung berpangkat 1/6' },
      { label: 'Akar Pecahan Berpangkat', display: '(√(2x²/y⁴))⁵', latex: '\\left(\\sqrt{\\frac{2x^2}{y^4}}\\right)^5', desc: 'Akar kuadrat pecahan di dalam kurung berpangkat 5' },
      { label: 'Rumus ABC', display: 'x = (-b ± √D)/2a', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', desc: 'Akar persamaan kuadrat' },
      { label: 'Nilai Mutlak', display: '|x|', latex: '|x|', desc: 'Nilai absolut' },
      { label: 'Logaritma', display: 'ᵃlog b', latex: '\\log_{a}(b)', desc: 'Logaritma basis a' },
      { label: 'Sistem Persamaan', display: '{ ax+by=c', latex: '\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}', desc: 'Sistem persamaan linear 2 variabel' },
    ],
  },
  {
    category: '📊 Kalkulus & Matriks',
    items: [
      { label: 'Matriks 2x2', display: '[ a b / c d ]', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', desc: 'Matriks 2 baris 2 kolom' },
      { label: 'Matriks 3x3', display: 'Matriks 3x3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', desc: 'Matriks 3 baris 3 kolom' },
      { label: 'Integral Tentu', display: '∫ f(x) dx', latex: '\\int_{a}^{b} f(x) \\, dx', desc: 'Integral dengan batas bawah & atas' },
      { label: 'Limit', display: 'lim x→0', latex: '\\lim_{x \\to 0} f(x)', desc: 'Limit fungsi' },
      { label: 'Sigma / Deret', display: '∑ i=1..n', latex: '\\sum_{i=1}^{n} x_i', desc: 'Notasi penjumlahan deret' },
    ],
  },
  {
    category: '🔣 Simbol & Relasi',
    items: [
      { label: 'Kurang Sama', display: '≤', latex: '\\le', desc: 'Kurang dari atau sama dengan' },
      { label: 'Lebih Sama', display: '≥', latex: '\\ge', desc: 'Lebih dari atau sama dengan' },
      { label: 'Tidak Sama', display: '≠', latex: '\\neq', desc: 'Tidak sama dengan' },
      { label: 'Mendekati', display: '≈', latex: '\\approx', desc: 'Hampir sama / estimasi' },
      { label: 'Tak Hingga', display: '∞', latex: '\\infty', desc: 'Nilai tak hingga' },
      { label: 'Theta', display: 'θ', latex: '\\theta', desc: 'Sudut trigonometri' },
      { label: 'Alpha', display: 'α', latex: '\\alpha', desc: 'Sudut alpha' },
      { label: 'Beta', display: 'β', latex: '\\beta', desc: 'Sudut beta' },
      { label: 'Vektor', display: 'v⃗', latex: '\\vec{v}', desc: 'Notasi panah vektor' },
    ],
  },
];

export default function CbtMathToolbar({ onInsert, targetLabel = 'kolom soal' }: CbtMathToolbarProps) {
  // Default autohide (tertutup) agar rapi untuk guru mapel non-matematika
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [lastInserted, setLastInserted] = useState<string | null>(null);

  // Membaca preferensi guru apakah menyukai toolbar terbuka atau tertutup
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cbt_math_toolbar_open');
      if (saved !== null) {
        setIsOpen(saved === 'true');
      }
    } catch {
      // Abaikan jika SSR atau localStorage tidak tersedia
    }
  }, []);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cbt_math_toolbar_open', String(next));
      } catch {}
      return next;
    });
  };

  const handleInsertSnippet = (latex: string) => {
    // Sisipkan dalam format $ ... $ untuk inline KaTeX
    const wrapped = `$${latex}$`;
    onInsert(wrapped);
    setLastInserted(latex);
    setTimeout(() => setLastInserted(null), 1800);
  };

  // Tampilan Ringkas / Autohide (Hanya 1 baris tombol rapi, sangat ramah untuk guru non-matematika)
  if (!isOpen) {
    return (
      <div className="flex items-center justify-between py-1">
        <button
          type="button"
          onClick={toggleOpen}
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50/90 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 transition shadow-2xs hover:shadow cursor-pointer"
        >
          <Calculator size={14} className="text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
          <span>Sisipkan Rumus Matematika (KaTeX)</span>
          <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-normal bg-purple-100/70 dark:bg-purple-900/50 px-1.5 py-0.5 rounded-md">
            Opsional
          </span>
          <ChevronDown size={13} className="text-purple-500 group-hover:translate-y-0.5 transition-transform" />
        </button>

        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic hidden sm:inline">
          (Klik untuk membuka tombol rumus MTK / Eksak)
        </span>
      </div>
    );
  }

  return (
    <div className="p-2.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200/80 dark:border-purple-800/60 space-y-2 animate-in fade-in-50 duration-200">
      {/* Header Bar Toolbar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
          <Calculator size={14} className="text-purple-600 dark:text-purple-400" />
          <span>Toolbar Rumus MTK & Eksak:</span>
          {lastInserted && (
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full animate-in fade-in flex items-center gap-1">
              <Check size={11} /> Disisipkan!
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle size={12} />
            <span className="hidden sm:inline">Panduan Format</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition flex items-center gap-1 cursor-pointer"
          >
            <span>{showAdvanced ? 'Tutup Lanjutan' : '+ Rumus Lengkap'}</span>
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <button
            type="button"
            onClick={toggleOpen}
            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            title="Sembunyikan toolbar rumus agar tampilan kembali ringkas"
          >
            <ChevronUp size={12} />
            <span>Sembunyikan</span>
          </button>
        </div>
      </div>

      {/* Row 1: Quick Formula Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {COMMON_FORMULAS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleInsertSnippet(item.latex)}
            title={item.desc}
            className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:bg-purple-100/50 dark:hover:bg-purple-900/40 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-purple-600 dark:text-purple-400 font-bold">{item.display}</span>
            <span className="text-[10px] text-slate-400 font-sans">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Row 2: Advanced Formulas (Dropdown Expandable) */}
      {showAdvanced && (
        <div className="pt-2 border-t border-purple-200/50 dark:border-purple-800/40 space-y-2.5 animate-in fade-in duration-150">
          {ADVANCED_FORMULAS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {group.category}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {group.items.map((it, iIdx) => (
                  <button
                    key={iIdx}
                    type="button"
                    onClick={() => handleInsertSnippet(it.latex)}
                    title={it.desc}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:bg-purple-100/50 dark:hover:bg-purple-900/40 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="text-purple-600 dark:text-purple-400 font-bold">{it.display}</span>
                    <span className="text-[10px] text-slate-400 font-sans">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Modal / Box */}
      {showHelp && (
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 animate-in fade-in duration-150">
          <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center justify-between">
            <span>💡 Cara Menulis Rumus Matematika (KaTeX):</span>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕ Tutup
            </button>
          </div>
          <p className="leading-relaxed">
            - Klik tombol rumus di atas untuk langsung menyisipkan rumus ke {targetLabel}.
            <br />
            - Anda juga bisa mengetik rumus langsung diapit tanda dollar <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-600 font-bold">$...$</code> (misal: <code className="font-mono text-purple-600">$x^2 + 5x + 6 = 0$</code>).
            <br />
            - Untuk rumus besar di baris tersendiri di tengah layar, gunakan tanda double dollar <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-600 font-bold">$$...$$</code>.
          </p>
        </div>
      )}
    </div>
  );
}

