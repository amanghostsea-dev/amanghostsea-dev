import { getWebSettings } from "@/app/admin/settings/actions";
import TracerStudyClient from "./TracerStudyClient";

export async function generateMetadata() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";
  return {
    title: `Tracer Study - ${schoolName}`,
    description: `Tracer Study Alumni ${schoolName}`,
  };
}

export const dynamic = "force-dynamic";

export default async function TracerStudyPage() {
  const settings = await getWebSettings();
  const schoolName = settings?.schoolName || "SMK GaMa";
  
  return <TracerStudyClient schoolName={schoolName} />;
}
