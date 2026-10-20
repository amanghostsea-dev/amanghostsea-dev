import SambutanClient from "./SambutanClient";
import { getSambutanData } from "./actions";

export const dynamic = "force-dynamic";

export default async function SambutanPage() {
  const initialData = await getSambutanData();
  return <SambutanClient initialData={initialData} />;
}
