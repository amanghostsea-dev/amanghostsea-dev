import AdminSidebar from '@/app/admin/AdminSidebar';
import { getWebSettings } from '@/app/admin/settings/actions';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function GuruPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('auth_token')?.value;
  const userName = cookieStore.get('auth_name')?.value || 'Guru';

  if (!userRole || (userRole !== 'Guru' && userRole !== 'Super Admin')) {
    redirect('/login');
  }

  const settings = await getWebSettings();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      <AdminSidebar logoUrl={settings?.logoUrl} userRole="Guru" userName={userName} />

      {/* Main Content Area */}
      <div className="flex-1 w-full min-w-0">
        {children}
      </div>
    </div>
  );
}

