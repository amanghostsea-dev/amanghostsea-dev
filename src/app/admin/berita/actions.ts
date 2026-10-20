'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function createBerita(data: any) {
  try {
    const cookieStore = await cookies();
    const authorId = cookieStore.get('auth_user')?.value || 'admin';
    const newBerita = await prisma.berita.create({
      data: {
        title: data.title,
        category: data.category,
        content: data.content || '',
        status: data.status,
        authorId: authorId,
        // using the submitted date or current time
        createdAt: data.date ? new Date(data.date) : new Date(),
      },
    });
    revalidatePath('/admin/berita');
    return { success: true, data: newBerita };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateBerita(id: string, data: any) {
  try {
    const updated = await prisma.berita.update({
      where: { id },
      data: {
        title: data.title,
        category: data.category,
        content: data.content || '',
        status: data.status,
        createdAt: data.date ? new Date(data.date) : undefined,
      },
    });
    revalidatePath('/admin/berita');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteBerita(id: string) {
  try {
    await prisma.berita.delete({
      where: { id },
    });
    revalidatePath('/admin/berita');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
