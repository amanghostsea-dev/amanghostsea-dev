'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveSambutanData(data: any) {
  try {
    const value = JSON.stringify(data);
    await prisma.setting.upsert({
      where: { key: 'sambutanData' },
      update: { value },
      create: {
        key: 'sambutanData',
        value,
        description: 'Data profil dan sambutan kepala sekolah',
      },
    });
    revalidatePath('/admin/sambutan');
    revalidatePath('/profil/sambutan');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getSambutanData() {
  const setting = await prisma.setting.findUnique({
    where: { key: 'sambutanData' },
  });
  if (setting) {
    return JSON.parse(setting.value);
  }
  return null;
}
