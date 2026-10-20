'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createJurusan(data: any) {
  try {
    const newJurusan = await prisma.jurusan.create({
      data: {
        name: data.name,
        code: data.code,
        kuota: parseInt(data.kuota) || 0,
        description: data.description || '',
      },
    });
    revalidatePath('/admin/jurusan');
    revalidatePath('/ppdb');
    revalidatePath('/');
    return { success: true, data: newJurusan };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateJurusan(id: string, data: any) {
  try {
    const updated = await prisma.jurusan.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        kuota: parseInt(data.kuota) || 0,
        description: data.description || '',
      },
    });
    revalidatePath('/admin/jurusan');
    revalidatePath('/ppdb');
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteJurusan(id: string) {
  try {
    await prisma.jurusan.delete({
      where: { id },
    });
    revalidatePath('/admin/jurusan');
    revalidatePath('/ppdb');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

