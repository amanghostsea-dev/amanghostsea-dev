'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveWebSettings(data: any) {
  try {
    const value = JSON.stringify(data);
    await prisma.setting.upsert({
      where: { key: 'webSettings' },
      update: { value },
      create: {
        key: 'webSettings',
        value,
        description: 'Web Settings (Logo, Name, Tagline)',
      },
    });
    revalidatePath('/admin/settings');
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getWebSettings() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'webSettings' },
    });
    if (setting) {
      return JSON.parse(setting.value);
    }
  } catch (error) {
    console.warn('Could not fetch webSettings from DB, using defaults.', error);
  }
  return null;
}
