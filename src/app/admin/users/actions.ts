'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth'

export async function getUsers() {
  await requireSuperAdmin();
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function createUser(data: { name: string; username: string; role: string; status: string; password?: string }) {
  await requireSuperAdmin();
  try {
    const password = data.password && data.password.trim() !== '' 
      ? data.password 
      : Math.random().toString(36).slice(-8);
    
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        role: data.role,
        status: data.status,
        password: password,
      }
    });
    revalidatePath('/admin/users');
    return { success: true, data: newUser };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

export async function updateUser(id: string, data: { name: string; username: string; role: string; status: string; password?: string }) {
  await requireSuperAdmin();
  try {
    const updateData: { name: string; username: string; role: string; status: string; password?: string } = {
      name: data.name,
      username: data.username,
      role: data.role,
      status: data.status,
    };
    
    if (data.password && data.password.trim() !== '') {
      updateData.password = data.password;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });
    revalidatePath('/admin/users');
    return { success: true, data: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

export async function deleteUser(id: string) {
  await requireSuperAdmin();
  try {
    await prisma.user.delete({
      where: { id }
    });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: message };
  }
}

