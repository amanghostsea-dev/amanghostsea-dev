import { getWebSettings } from "@/app/admin/settings/actions";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const settings = await getWebSettings();
  return <NavbarClient settings={settings} />;
}
