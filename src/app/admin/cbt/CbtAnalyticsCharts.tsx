'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Award, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  BookOpen, 
  Layers,
  Sparkles,
  ChevronDown,
  Info
} from 'lucide-react';

export interface ReportItemForChart {
  attemptId: string;
  examId: string;
  examTitle: string;
  subject: string;
  examClassTarget: string;
  examAuthor: string;
  studentName: string;
  studentNis: string;
  studentClass: string;
  score: number;
  totalQuestions: number;
  totalCorrect: number;
  status: string;
  tabSwitchCount: number;
  startedAt: string | Date;
  submittedAt: string | Date | null;
}

interface CbtAnalyticsChartsProps {
  rows: ReportItemForChart[];
  kkmScore?: number;
}

export default function CbtAnalyticsCharts({
  rows,
  kkmScore = 75,
}: CbtAnalyticsChartsProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredScoreBucket, setHoveredScoreBucket] = useState<string | null>(null);
  const [rankCategory, setRankCategory] = useState<'subject' | 'jurusan'>('subject');

  useEffect(() => {
    // Trigger smooth entrance animation
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Filter submitted rows for grading calculations
  const submittedRows = useMemo(() => {
    return rows.filter((r) => r.status === 'SUBMITTED');
  }, [rows]);

  const totalSubmitted = submittedRows.length;
  const inProgressCount = rows.filter((r) => r.status === 'IN_PROGRESS').length;

  // 1. Distribusi Rentang Nilai
  const distributionData = useMemo(() => {
    let range90_100 = 0;
    let range75_89 = 0;
    let range60_74 = 0;
    let rangeBelow60 = 0;

    submittedRows.forEach((r) => {
      const s = r.score;
      if (s >= 90) range90_100++;
      else if (s >= kkmScore) range75_89++;
      else if (s >= 60) range60_74++;
      else rangeBelow60++;
    });

    const maxCount = Math.max(range90_100, range75_89, range60_74, rangeBelow60, 1);

    return [
      {
        id: 'tier1',
        range: '90 - 100',
        label: 'Sangat Memuaskan',
        count: range90_100,
        percentage: totalSubmitted > 0 ? Math.round((range90_100 / totalSubmitted) * 100) : 0,
        colorGradient: 'from-emerald-500 to-teal-400',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
        borderColor: 'border-emerald-300 dark:border-emerald-800',
        fillPercent: (range90_100 / maxCount) * 100,
      },
      {
        id: 'tier2',
        range: `${kkmScore} - 89`,
        label: 'Tuntas / Baik',
        count: range75_89,
        percentage: totalSubmitted > 0 ? Math.round((range75_89 / totalSubmitted) * 100) : 0,
        colorGradient: 'from-indigo-500 to-purple-400',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
        borderColor: 'border-indigo-300 dark:border-indigo-800',
        fillPercent: (range75_89 / maxCount) * 100,
      },
      {
        id: 'tier3',
        range: `60 - ${kkmScore - 1}`,
        label: 'Remedial Ringan',
        count: range60_74,
        percentage: totalSubmitted > 0 ? Math.round((range60_74 / totalSubmitted) * 100) : 0,
        colorGradient: 'from-amber-500 to-orange-400',
        textColor: 'text-amber-600 dark:text-amber-400',
        bgLight: 'bg-amber-50 dark:bg-amber-950/40',
        borderColor: 'border-amber-300 dark:border-amber-800',
        fillPercent: (range60_74 / maxCount) * 100,
      },
      {
        id: 'tier4',
        range: '< 60',
        label: 'Perlu Bimbingan',
        count: rangeBelow60,
        percentage: totalSubmitted > 0 ? Math.round((rangeBelow60 / totalSubmitted) * 100) : 0,
        colorGradient: 'from-rose-500 to-red-400',
        textColor: 'text-rose-600 dark:text-rose-400',
        bgLight: 'bg-rose-50 dark:bg-rose-950/40',
        borderColor: 'border-rose-300 dark:border-rose-800',
        fillPercent: (rangeBelow60 / maxCount) * 100,
      },
    ];
  }, [submittedRows, totalSubmitted, kkmScore]);

  // 2. Ketuntasan KKM (Donut Radial)
  const passStats = useMemo(() => {
    const passed = submittedRows.filter((r) => r.score >= kkmScore).length;
    const remedial = submittedRows.filter((r) => r.score < kkmScore).length;
    const rate = totalSubmitted > 0 ? Math.round((passed / totalSubmitted) * 100) : 0;
    
    // Status text & color
    let statusLabel = 'Tinggi';
    let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800';
    if (rate < 60) {
      statusLabel = 'Perlu Perhatian';
      statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800';
    } else if (rate < 75) {
      statusLabel = 'Cukup Baik';
      statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800';
    }

    return { passed, remedial, rate, statusLabel, statusColor };
  }, [submittedRows, totalSubmitted, kkmScore]);

  // SVG Donut calculation: circumference = 2 * PI * r (r = 45 => ~282.7)
  const circumference = 2 * Math.PI * 45;
  const passedStroke = totalSubmitted > 0 ? (passStats.passed / totalSubmitted) * circumference : 0;
  const remedialStroke = totalSubmitted > 0 ? (passStats.remedial / totalSubmitted) * circumference : 0;

  // 3. Peringkat Nilai Rata-rata per Mata Pelajaran
  const subjectAverages = useMemo(() => {
    const map = new Map<string, { total: number; sum: number; min: number; max: number }>();
    submittedRows.forEach((r) => {
      const sub = r.subject || 'Mapel Lainnya';
      const cur = map.get(sub) || { total: 0, sum: 0, min: 100, max: 0 };
      cur.total++;
      cur.sum += r.score;
      if (r.score < cur.min) cur.min = r.score;
      if (r.score > cur.max) cur.max = r.score;
      map.set(sub, cur);
    });

    return Array.from(map.entries())
      .map(([name, stat]) => ({
        name,
        avg: Math.round(stat.sum / stat.total),
        total: stat.total,
        min: stat.min,
        max: stat.max,
        isAboveKkm: Math.round(stat.sum / stat.total) >= kkmScore,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [submittedRows, kkmScore]);

  // 4. Peringkat Nilai per Jurusan
  const jurusanAverages = useMemo(() => {
    const map = new Map<string, { total: number; sum: number }>();
    submittedRows.forEach((r) => {
      const cls = r.studentClass.toUpperCase();
      let jur = 'LAINNYA';
      if (cls.includes('TJKT') || cls.includes('TKJ')) jur = 'TJKT';
      else if (cls.includes('DKV') || cls.includes('MM')) jur = 'DKV';
      else if (cls.includes('AKL') || cls.includes('AK')) jur = 'AKL';
      else if (cls.includes('MPLB') || cls.includes('OTKP')) jur = 'MPLB';
      else if (cls.includes('BR') || cls.includes('BDP')) jur = 'BISNIS';

      const cur = map.get(jur) || { total: 0, sum: 0 };
      cur.total++;
      cur.sum += r.score;
      map.set(jur, cur);
    });

    return Array.from(map.entries())
      .map(([name, stat]) => ({
        name,
        avg: Math.round(stat.sum / stat.total),
        total: stat.total,
        isAboveKkm: Math.round(stat.sum / stat.total) >= kkmScore,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [submittedRows, kkmScore]);

  // 5. Integritas Siswa / Anti-Cheat Analytics
  const integrityStats = useMemo(() => {
    let clean = 0;
    let warnings = 0;
    let violated = 0;

    rows.forEach((r) => {
      if (r.tabSwitchCount === 0) clean++;
      else if (r.tabSwitchCount < 3) warnings++;
      else violated++;
    });

    const total = rows.length || 1;
    return {
      clean,
      cleanPercent: Math.round((clean / total) * 100),
      warnings,
      warningsPercent: Math.round((warnings / total) * 100),
      violated,
      violatedPercent: Math.round((violated / total) * 100),
    };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-400">
        <BarChart3 size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-xs font-semibold">Belum ada data pengerjaan ujian untuk ditampilkan dalam grafik analitik.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* 🌟 Header Section Grafik */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            <Sparkles size={13} /> Visual Analytics &amp; Visualisasi Evaluasi CBT
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Dashboard Grafik Interaktif Hasil Ujian
          </h3>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium self-start sm:self-auto">
          Standar Target KKM: <span className="font-bold text-purple-600 dark:text-purple-400">{kkmScore}</span>
        </div>
      </div>

      {/* Grid 2 Kolom: Distribusi Nilai & Ketuntasan Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 📊 Grafik 1: Distribusi Rentang Nilai (Bar Chart Beranimasi) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 size={17} className="text-purple-600 dark:text-purple-400" />
                Distribusi Sebaran Nilai Siswa
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pengelompokan hasil ujian dari {totalSubmitted} siswa yang telah selesai submit
              </p>
            </div>
          </div>

          {/* Vertical Bar Chart Container */}
          <div className="pt-6 pb-2">
            <div className="grid grid-cols-4 gap-2 sm:gap-4 items-end h-48 sm:h-52 px-2 border-b border-slate-100 dark:border-slate-800 relative">
              {/* Horizontal Reference Line at 50% */}
              <div className="absolute left-0 right-0 top-1/2 border-b border-dashed border-slate-200 dark:border-slate-800 pointer-events-none" />

              {distributionData.map((item) => (
                <div 
                  key={item.id} 
                  className="flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoveredScoreBucket(item.id)}
                  onMouseLeave={() => setHoveredScoreBucket(null)}
                >
                  {/* Floating Tooltip Hover */}
                  <div className={`absolute -top-11 z-20 transition-all duration-200 pointer-events-none ${hoveredScoreBucket === item.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <div className="px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[10px] font-bold shadow-xl border border-slate-700 whitespace-nowrap">
                      {item.count} Siswa ({item.percentage}%)
                    </div>
                  </div>

                  {/* Number On Top of Bar */}
                  <span className={`text-xs font-black mb-1 transition-all duration-300 ${item.textColor} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    {item.count}
                  </span>

                  {/* Animated Growing Bar */}
                  <div className="w-full max-w-[58px] bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1 h-full flex items-end overflow-hidden">
                    <div 
                      className={`w-full rounded-xl bg-gradient-to-t ${item.colorGradient} transition-all duration-1000 ease-out shadow-sm group-hover:brightness-110 group-hover:scale-y-[1.02] origin-bottom`}
                      style={{
                        height: mounted ? `${Math.max(item.fillPercent, 8)}%` : '0%',
                      }}
                    />
                  </div>

                  {/* Range Label Under Bar */}
                  <div className="text-center mt-2 space-y-0.5">
                    <span className="block text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                      {item.range}
                    </span>
                    <span className="hidden sm:block text-[9px] text-slate-400 font-medium truncate max-w-[70px]">
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {distributionData.map((d) => (
              <div key={d.id} className={`p-2 rounded-xl ${d.bgLight} border ${d.borderColor} text-center space-y-0.5`}>
                <div className={`text-xs font-black ${d.textColor}`}>
                  {d.percentage}%
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">
                  {d.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🍩 Grafik 2: Donut Radial Ketuntasan KKM */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart size={17} className="text-indigo-600 dark:text-indigo-400" />
                Ketuntasan Belajar KKM
              </h4>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${passStats.statusColor}`}>
                {passStats.statusLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Rasio kelulusan siswa terhadap batas KKM {kkmScore}
            </p>
          </div>

          {/* Animated SVG Donut Chart */}
          <div className="relative flex items-center justify-center py-2">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Track Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />

              {/* Tuntas Segment (Emerald) */}
              <circle
                cx="50"
                cy="50"
                r="45"
                className="text-emerald-500 transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={mounted ? circumference - passedStroke : circumference}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />

              {/* Remedial Segment (Amber) */}
              {remedialStroke > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-amber-500 transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  strokeDasharray={`${remedialStroke} ${circumference}`}
                  strokeDashoffset={mounted ? -(passedStroke) : 0}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              )}
            </svg>

            {/* Centered Statistic Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {passStats.rate}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tuntas KKM
              </span>
            </div>
          </div>

          {/* Detail Legend List */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400">Siswa Tuntas (&ge; {kkmScore})</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {passStats.passed} Siswa
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-400">Perlu Remedial (&lt; {kkmScore})</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {passStats.remedial} Siswa
              </span>
            </div>

            {inProgressCount > 0 && (
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                  <span>Sedang Mengerjakan</span>
                </div>
                <span className="font-bold">{inProgressCount} Siswa</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom: Ranking Mapel/Jurusan & Integritas Ujian */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 📈 Grafik 3: Ranking Nilai Horizontal (Mata Pelajaran & Jurusan) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={17} className="text-emerald-600 dark:text-emerald-400" />
                Perbandingan Rata-Rata Nilai
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Evaluasi performa nilai terhadap standar KKM ({kkmScore})
              </p>
            </div>

            {/* Toggle Category */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRankCategory('subject')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  rankCategory === 'subject'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Per Mapel
              </button>
              <button
                type="button"
                onClick={() => setRankCategory('jurusan')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  rankCategory === 'jurusan'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Per Jurusan
              </button>
            </div>
          </div>

          {/* Horizontal Ranking Bars List */}
          <div className="space-y-3.5 pt-1">
            {(rankCategory === 'subject' ? subjectAverages : jurusanAverages).slice(0, 6).map((item, idx) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                    {idx + 1}. {item.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`font-black ${item.isAboveKkm ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {item.avg}
                    </span>
                    <span className="text-[10px] text-slate-400">({item.total} siswa)</span>
                  </div>
                </div>

                {/* Progress Bar Container with Reference Line at KKM */}
                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                  {/* Reference Marker KKM */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
                    style={{ left: `${kkmScore}%` }}
                    title={`Batas KKM: ${kkmScore}`}
                  />
                  {/* Animated Bar Fill */}
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      item.isAboveKkm
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-orange-400'
                    }`}
                    style={{
                      width: mounted ? `${Math.min(item.avg, 100)}%` : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🛡️ Grafik 4: Integritas Ujian & Kepatuhan Siswa (Anti-Cheat Analytics) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={17} className="text-emerald-600 dark:text-emerald-400" />
                Integritas &amp; Kepatuhan Siswa
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Anti-Cheat Guard
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring perilaku perpindahan tab / aplikasi selama CBT
            </p>
          </div>

          {/* Multi-segmented Bar Visual */}
          <div className="space-y-3 pt-2">
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: mounted ? `${integrityStats.cleanPercent}%` : '0%' }}
                title={`Disiplin Penuh: ${integrityStats.cleanPercent}%`}
              />
              <div 
                className="h-full bg-amber-500 transition-all duration-1000 ease-out"
                style={{ width: mounted ? `${integrityStats.warningsPercent}%` : '0%' }}
                title={`Peringatan Ringan: ${integrityStats.warningsPercent}%`}
              />
              <div 
                className="h-full bg-rose-500 transition-all duration-1000 ease-out"
                style={{ width: mounted ? `${integrityStats.violatedPercent}%` : '0%' }}
                title={`Pelanggaran Berat: ${integrityStats.violatedPercent}%`}
              />
            </div>

            {/* Checklist Integritas */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">0x Pindah Tab (100% Jujur)</span>
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {integrityStats.clean} ({integrityStats.cleanPercent}%)
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">1-2x Pindah Tab (Peringatan)</span>
                </div>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {integrityStats.warnings} ({integrityStats.warningsPercent}%)
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-rose-600 dark:text-rose-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">3x+ Terkunci / Suspend</span>
                </div>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {integrityStats.violated} ({integrityStats.violatedPercent}%)
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-[11px] text-purple-900 dark:text-purple-300 flex items-center gap-2">
            <Info size={13} className="shrink-0 text-purple-600" />
            <span>Sistem CBT secara otomatis mengunci lembar ujian pada siswa yang melanggar batas perpindahan layar.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
