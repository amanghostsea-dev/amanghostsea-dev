import { getWebSettings } from "@/lib/settings";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const settings = await getWebSettings();
  return <NavbarClient settings={settings} />;
}

