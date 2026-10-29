import AdminSidebar from './AdminSidebar';
import { getWebSettings } from '@/app/admin/settings/actions';
import { cookies } from 'next/headers';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const settings = await getWebSettings();
  const cookieStore = await cookies();
  const userRole = cookieStore.get('auth_token')?.value || '';
  const userName = cookieStore.get('auth_name')?.value || 'User';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      <AdminSidebar logoUrl={settings?.logoUrl} userRole={userRole} userName={userName} />

      {/* Main Content Area */}
      <div className="flex-1 w-full min-w-0">
         {children}
      </div>
    </div>
  );
}
