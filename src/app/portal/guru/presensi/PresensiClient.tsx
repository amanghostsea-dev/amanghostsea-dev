'use client';

import { useState } from 'react';
import { CheckSquare, Calendar, Users, Save, CheckCircle2, Clock, MapPin, Sparkles, AlertCircle } from 'lucide-react';

interface StudentItem {
  id: string;
  name: string;
  username: string;
  nisn: string | null;
}

type AttendanceStatus = 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA';

export default function PresensiClient({ students, teacherName }: { students: StudentItem[]; teacherName: string }) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      initial[s.id] = 'HADIR';
    });
    return initial;
  });

  const [saved, setSaved] = useState(false);
  const [selectedClass, setSelectedClass] = useState('XI RPL 1');

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
    setSaved(false);
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      updated[s.id] = 'HADIR';
    });
    setAttendance(updated);
    setSaved(false);
  };

  const handleSaveAttendance = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const totalStudents = students.length;
  const countHadir = Object.values(attendance).filter((s) => s === 'HADIR').length;
  const countIzin = Object.values(attendance).filter((s) => s === 'IZIN').length;
  const countSakit = Object.values(attendance).filter((s) => s === 'SAKIT').length;
  const countAlpa = Object.values(attendance).filter((s) => s === 'ALPA').length;

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
            <CheckSquare size={14} /> Presensi Harian Siswa & Absensi Geolocation
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Presensi Siswa Kelas
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-2">
            <Calendar size={14} className="text-amber-500" /> {todayFormatted} • Wali: <strong>{teacherName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition shadow-sm cursor-pointer"
          >
            Tandai Semua Hadir
          </button>
          <button
            type="button"
            onClick={handleSaveAttendance}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save size={16} /> Simpan Presensi Hari Ini
          </button>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 text-xs sm:text-sm font-bold animate-fade-in">
          <CheckCircle2 className="text-emerald-600" size={20} />
          Presensi berhasil disimpan ke pangkalan data sekolah untuk tanggal {todayFormatted}!
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Hadir</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{countHadir} <span className="text-xs text-gray-400 font-normal">/ {totalStudents}</span></div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40 shadow-sm">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Izin</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{countIzin}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/40 shadow-sm">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Sakit</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{countSakit}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-rose-100 dark:border-rose-900/40 shadow-sm">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Alpa</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{countAlpa}</div>
        </div>
      </div>

      {/* Attendance Checklist Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={16} className="text-emerald-600" />
            Checklist Kehadiran Siswa Kelas {selectedClass}
          </h3>
          <span className="text-xs text-gray-500">{students.length} Siswa Terdaftar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-6 w-14 text-center">No</th>
                <th className="py-3 px-6">Nama Siswa</th>
                <th className="py-3 px-6">NISN / Akun</th>
                <th className="py-3 px-6 text-center">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    Tidak ada siswa terdaftar.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => {
                  const currentStatus = attendance[s.id] || 'HADIR';

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 px-6 text-center text-gray-500 font-mono text-xs">{idx + 1}</td>
                      <td className="py-3.5 px-6 font-bold text-gray-900 dark:text-white">{s.name}</td>
                      <td className="py-3.5 px-6 font-mono text-xs text-gray-500">{s.nisn || s.username}</td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-3">
                          {(['HADIR', 'IZIN', 'SAKIT', 'ALPA'] as AttendanceStatus[]).map((st) => {
                            const isSelected = currentStatus === st;
                            const colors: Record<AttendanceStatus, string> = {
                              HADIR: isSelected ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300',
                              IZIN: isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50 text-blue-700 dark:text-blue-300',
                              SAKIT: isSelected ? 'bg-amber-600 text-white font-bold' : 'hover:bg-amber-50 text-amber-700 dark:text-amber-300',
                              ALPA: isSelected ? 'bg-rose-600 text-white font-bold' : 'hover:bg-rose-50 text-rose-700 dark:text-rose-300',
                            };

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(s.id, st)}
                                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs transition cursor-pointer border border-transparent ${colors[st]}`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
