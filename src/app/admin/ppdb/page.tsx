import { getSubmissions } from './actions'
import PPDBClient from './PPDBClient'

export const dynamic = 'force-dynamic';

export default async function AdminPPDBPage() {
  const submissions = await getSubmissions();
  return <PPDBClient initialSubmissions={submissions} />;
}
