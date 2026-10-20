import prisma from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, Clock, AlertTriangle, Building, Banknote, CreditCard, ArrowLeft, Download, Printer, Search, Phone } from "lucide-react";
import PrintButton from "./PrintButton";
import SuccessNotificationBanner from "./SuccessNotificationBanner";
import { getPPDBPaymentConfig } from "@/app/admin/settings/actions";
import { getTrackConfig } from "@/app/admin/settings/types";

export const dynamic = "force-dynamic";

export default async function PPDBSucceessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const id = resolvedParams.id as string;
  const urlName = resolvedParams.name as string;

  const [applicant, paymentConfig] = await Promise.all([
    id
      ? prisma.ppdbApplicant.findUnique({ where: { id } }).catch((e) => {
          console.error('Error fetching applicant for success page:', e);
          return null;
        })
      : Promise.resolve(null),
    getPPDBPaymentConfig(),
  ]);

  const name = applicant?.fullName || urlName || 'Calon Siswa';
  const nisn = applicant?.nisn || '-';
  const major = applicant?.major || '-';
  const jalur = applicant?.jalur || 'normal';
  const paymentStatus = applicant?.paymentStatus || 'PENDING';
  const trackConfig = getTrackConfig(paymentConfig, jalur);
  const totalAmount = applicant?.paymentAmount !== null && applicant?.paymentAmount !== undefined 
    ? applicant.paymentAmount 
    : (trackConfig.totalAmount || 0);

  const paymentMethod = applicant?.paymentMethod || (totalAmount > 0 ? 'TRANSFER' : 'BEASISWA / BEBAS BIAYA');
  const regId = id ? `PPDB-${id.slice(-6).toUpperCase()}` : 'PPDB-XXXXXX';
  const cashCode = id ? `CASH-${id.slice(-6).toUpperCase()}` : 'CASH-XXXXXX';

  return (
    <div className="min-h-screen bg-slate-100/90 font-sans py-10 px-4 sm:px-6 relative text-slate-800">
      
      {/* Container */}
      <div className="max-w-2xl mx-auto">

        {/* Futuristic Confirmation Notification Banner */}
        <SuccessNotificationBanner
          name={name}
          regId={regId}
          nisn={nisn}
          jalur={jalur}
          paymentStatus={paymentStatus}
          paymentMethod={paymentMethod}
        />

        {/* Printable Card */}
        <div id="print-area" className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:border-none print:shadow-none p-6 sm:p-10 mb-6">
          
          {/* Header Kop */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">SMK GAMA</h2>
              <p className="text-xs text-slate-500 font-medium">Panitia Penerimaan Peserta Didik Baru (PPDB)</p>
              <p className="text-[11px] text-slate-400">Bukti Registrasi & Status Pembayaran Formulir</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">No. Registrasi</span>
              <span className="text-base sm:text-lg font-black font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 inline-block mt-0.5">
                {regId}
              </span>
            </div>
          </div>

          {/* Status Banner */}
          <div className="mb-6">
            {paymentStatus === 'PAID' ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl flex-shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-emerald-950 text-base">Pembayaran Lunas & Terverifikasi (PAID)</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Formulir pendaftaran Anda telah berstatus lunas sah. Berkas pendaftaran siap diproses ke seleksi penerimaan.
                  </p>
                  {applicant?.verifiedBy && (
                    <div className="text-[11px] font-semibold text-emerald-800 mt-1.5">
                      Diverifikasi oleh: {applicant.verifiedBy}
                    </div>
                  )}
                </div>
              </div>
            ) : paymentStatus === 'PENDING_TRANSFER' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl flex-shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-950 text-base">
                    {paymentMethod === 'QRIS' ? 'Menunggu Verifikasi Bukti Pembayaran QRIS' : 'Menunggu Verifikasi Bukti Transfer'}
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Bukti {paymentMethod === 'QRIS' ? 'transaksi QRIS' : 'transfer'} telah Anda kirimkan dan sedang dalam antrean pemeriksaan oleh bendahara/panitia PPDB (maks. 1x24 jam).
                  </p>
                  {applicant?.paymentProof && (
                    <div className="mt-2">
                      <a 
                        href={applicant.paymentProof} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-blue-600 font-bold underline hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        Lihat Bukti {paymentMethod === 'QRIS' ? 'QRIS' : 'Transfer'} yang Diunggah &rarr;
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : paymentStatus === 'PENDING_CASH' ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-2 border-dashed border-emerald-300">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1.5">
                  <Banknote size={18} /> Instruksi Pembayaran Tunai (Loket PPDB)
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Kode Booking Bayar Tunai:</span>
                    <span className="text-2xl font-black font-mono text-emerald-950 tracking-wider">
                      {cashCode}
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-500 block">Nominal Tunai Pas:</span>
                    <span className="text-xl font-black text-emerald-800">
                      Rp {totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-600 bg-white/80 p-3 rounded-xl border border-emerald-200 mt-3 space-y-1">
                  <p><strong>Lokasi:</strong> {paymentConfig.cashLocation || 'Ruang Panitia PPDB / Loket Kasir Gedung Utama SMK GaMa'}</p>
                  <p><strong>Jam Layanan:</strong> {paymentConfig.cashHours || 'Senin s/d Sabtu, pukul 08.00 - 14.00 WIB (Batas: 3x24 Jam)'}</p>
                  <p>Tunjukkan kode booking ini kepada petugas kasir untuk mendapatkan kwitansi fisik bertanda tangan & cap resmi.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl flex-shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-blue-950 text-base">Pendaftaran Berhasil Diterima</h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Data pendaftaran Anda telah masuk ke dalam sistem seleksi PPDB SMK GaMa.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Rincian Komponen Biaya Pendaftaran */}
          {totalAmount > 0 && (
            <div className="border border-slate-200 rounded-2xl p-5 mb-6 text-sm bg-slate-50/50">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                <h5 className="font-bold text-slate-900 flex items-center gap-2">
                  <Banknote size={16} className="text-blue-600" />
                  Rincian Biaya ({trackConfig.title}):
                </h5>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {paymentStatus === 'PAID' ? 'LUNAS' : 'Menunggu Pelunasan'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {trackConfig.feeItems && trackConfig.feeItems.length > 0 ? (
                  trackConfig.feeItems.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-none">
                      <span className="text-slate-600">{item.name}</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp {Number(item.amount || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Biaya Administrasi & Seleksi</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rp {totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                <div className="pt-2 mt-1 border-t-2 border-slate-300 flex items-center justify-between font-bold text-sm text-slate-900">
                  <span>Total Tagihan Masuk</span>
                  <span className="font-mono text-blue-700 text-base">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Data Calon Siswa */}
          <div className="space-y-3 border border-slate-200 rounded-2xl p-5 mb-6 text-sm">
            <h5 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Rincian Data Pendaftar:</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Nama Lengkap</span>
                <span className="font-bold text-slate-900">{name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">NISN</span>
                <span className="font-bold text-slate-900 font-mono">{nisn}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Jalur Pendaftaran</span>
                <span className="font-bold text-slate-900 capitalize">{jalur}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Pilihan Jurusan</span>
                <span className="font-bold text-slate-900">{major}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Metode Pembayaran</span>
                <span className="font-bold text-slate-900">
                  {paymentMethod === 'CASH' ? 'Tunai di Loket PPDB' : paymentMethod === 'QRIS' ? 'QRIS (E-Wallet & M-Banking)' : paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'Gratis / Beasiswa'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Waktu Pendaftaran</span>
                <span className="font-bold text-slate-900">
                  {applicant?.createdAt ? new Date(applicant.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID')}
                </span>
              </div>
              {applicant?.kipNumber && (
                <div>
                  <span className="text-slate-400 block text-xs">Nomor Kartu KIP</span>
                  <span className="font-bold text-teal-700 font-mono">{applicant.kipNumber}</span>
                </div>
              )}
              {applicant?.afirmasiNumber && (
                <div>
                  <span className="text-slate-400 block text-xs">Nomor SKTM / Bantuan</span>
                  <span className="font-bold text-emerald-700 font-mono">{applicant.afirmasiNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Card */}
          <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
            Simpan bukti registrasi ini. Tunjukkan kepada panitia PPDB saat verifikasi berkas fisik atau tes masuk.
          </div>

        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center print:hidden">
          <PrintButton />
          <Link
            href={nisn !== '-' ? `/ppdb/status?nisn=${encodeURIComponent(nisn)}` : '/ppdb/status'}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            <Search size={18} /> Cek Status Pendaftaran
          </Link>
          <a
            href="https://smkgama.sch.id"
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            <ArrowLeft size={18} /> Kembali ke Beranda
          </a>
        </div>

        {/* WhatsApp Support Callout (Hidden on Print) */}
        <div className="mt-5 text-center print:hidden">
          <a
            href={`https://wa.me/6282246464677?text=Halo%20Panitia%20PPDB%20SMK%20GaMa,%20saya%20sudah%20mendaftar%20dengan%20No%20Registrasi%20${regId}%20dan%20NISN%20${nisn}.%20Saya%20ingin%20berkonsultasi.`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-300 transition-all shadow-sm"
          >
            <Phone size={14} className="text-emerald-600" />
            <span>Bantuan Panitia PPDB (WhatsApp: 0822-4646-4677)</span>
          </a>
        </div>

        {/* Creator Signature (Hidden on Print) */}
        <div className="mt-8 pt-4 border-t border-slate-200/60 text-center print:hidden flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Created by</span>
          <span className="font-bold text-slate-700">Abdul Rahman</span>
        </div>

      </div>

    </div>
  );
}
