'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveStrukturData(data: any) {
  try {
    const value = JSON.stringify(data);
    await prisma.setting.upsert({
      where: { key: 'strukturData' },
      update: { value },
      create: {
        key: 'strukturData',
        value,
        description: 'Data struktur organisasi',
      },
    });
    revalidatePath('/admin/struktur');
    revalidatePath('/profil/struktur');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getStrukturData() {
  const setting = await prisma.setting.findUnique({
    where: { key: 'strukturData' },
  });
  if (setting) {
    return JSON.parse(setting.value);
  }
  return null;
}
