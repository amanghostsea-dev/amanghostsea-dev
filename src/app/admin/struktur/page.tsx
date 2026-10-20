import StrukturClient from "./StrukturClient";
import { getStrukturData } from "./actions";

export const dynamic = "force-dynamic";

export default async function StrukturPage() {
  const initialData = await getStrukturData();
  return <StrukturClient initialData={initialData} />;
}
