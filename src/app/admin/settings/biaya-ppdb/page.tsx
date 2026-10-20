import { getPPDBPaymentConfig } from "../actions";
import BiayaPPDBClient from "./BiayaPPDBClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kelola Rincian Biaya PPDB - Admin Utama",
  description: "Pengaturan nominal dan rincian biaya pendaftaran calon siswa PPDB",
};

export default async function BiayaPPDBPage() {
  const paymentConfig = await getPPDBPaymentConfig();
  return <BiayaPPDBClient initialConfig={paymentConfig} />;
}
