'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { 
  PPDBFeeItem, 
  PPDBPaymentConfig, 
  DEFAULT_PPDB_PAYMENT_CONFIG,
  DEFAULT_TRACK_REGULER,
  DEFAULT_TRACK_AFIRMASI,
  DEFAULT_TRACK_PRESTASI
} from './types';

export async function saveWebSettings(data: any) {
  try {
    const existing = (await getWebSettings()) || {};
    const merged = { ...existing, ...data };
    const value = JSON.stringify(merged);
    await prisma.setting.upsert({
      where: { key: 'webSettings' },
      update: { value },
      create: {
        key: 'webSettings',
        value,
        description: 'Web Settings (Logo, Name, Tagline, Themes, Payment)',
      },
    });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/settings/biaya-ppdb');
    revalidatePath('/ppdb');
    revalidatePath('/ppdb/success');
    revalidatePath('/ppdb/status');
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

import { getWebSettings as libGetWebSettings, getPPDBPaymentConfig as libGetPPDBPaymentConfig } from '@/lib/settings';

export async function getWebSettings() {
  return await libGetWebSettings();
}

export async function getPPDBPaymentConfig(): Promise<PPDBPaymentConfig> {
  return await libGetPPDBPaymentConfig();
}


export async function savePPDBPaymentConfig(paymentConfig: PPDBPaymentConfig) {
  try {
    const current = (await getWebSettings()) || {};

    const regItems = paymentConfig.reguler?.feeItems || [];
    const regTotal = regItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const afItems = paymentConfig.afirmasi?.feeItems || [];
    const afTotal = afItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const prItems = paymentConfig.prestasi?.feeItems || [];
    const prTotal = prItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const sanitizedConfig: PPDBPaymentConfig = {
      ...paymentConfig,
      reguler: {
        ...paymentConfig.reguler,
        feeItems: regItems,
        totalAmount: regTotal,
      },
      afirmasi: {
        ...paymentConfig.afirmasi,
        feeItems: afItems,
        totalAmount: afTotal,
      },
      prestasi: {
        ...paymentConfig.prestasi,
        feeItems: prItems,
        totalAmount: prTotal,
      },
      // Legacy aliases
      title: paymentConfig.reguler?.title,
      notes: paymentConfig.reguler?.notes,
      feeItems: regItems,
      totalAmount: regTotal,
    };

    const updated = {
      ...current,
      ppdbPaymentConfig: sanitizedConfig,
    };
    return await saveWebSettings(updated);
  } catch (error: any) {
    return { error: error.message };
  }
}
