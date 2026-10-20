import { cookies } from 'next/headers';

const adminRoles = ['Super Admin', 'Panitia PPDB', 'Verifikator PPDB', 'Admin BKK', 'BKK'];

/**
 * Verify the caller is authenticated and has an admin role.
 * Returns the role string if valid, or throws an error.
 */
export async function requireAdmin(): Promise<{ role: string; name: string }> {
  const cookieStore = await cookies();
  const role = cookieStore.get('auth_token')?.value;
  const name = cookieStore.get('auth_name')?.value || 'Unknown';

  if (!role || !adminRoles.includes(role)) {
    throw new Error('Unauthorized: Anda tidak memiliki akses.');
  }

  return { role, name };
}

/**
 * Verify the caller is Super Admin specifically.
 */
export async function requireSuperAdmin(): Promise<{ role: string; name: string }> {
  const { role, name } = await requireAdmin();
  
  if (role !== 'Super Admin') {
    throw new Error('Forbidden: Hanya Super Admin yang diizinkan.');
  }

  return { role, name };
}
