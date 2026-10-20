import SettingsClient from "./SettingsClient";
import { getWebSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const initialData = await getWebSettings();
  return <SettingsClient initialData={initialData} />;
}
