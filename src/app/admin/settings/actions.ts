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

export async function getPPDBPaymentConfig(): Promise<PPDBPaymentConfig> {
  const settings = await getWebSettings();
  if (settings?.ppdbPaymentConfig) {
    const cfg = settings.ppdbPaymentConfig;

    // Reguler Track
    const regulerSource = cfg.reguler || {
      enabled: cfg.enabled !== false,
      title: cfg.title || DEFAULT_TRACK_REGULER.title,
      notes: cfg.notes || DEFAULT_TRACK_REGULER.notes,
      feeItems: cfg.feeItems || DEFAULT_TRACK_REGULER.feeItems,
    };
    const regItems: PPDBFeeItem[] = Array.isArray(regulerSource.feeItems) ? regulerSource.feeItems : DEFAULT_TRACK_REGULER.feeItems;
    const regTotal = regItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // Afirmasi Track
    const afirmasiSource = cfg.afirmasi || DEFAULT_TRACK_AFIRMASI;
    const afItems: PPDBFeeItem[] = Array.isArray(afirmasiSource.feeItems) ? afirmasiSource.feeItems : DEFAULT_TRACK_AFIRMASI.feeItems;
    const afTotal = afItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // Prestasi Track
    const prestasiSource = cfg.prestasi || DEFAULT_TRACK_PRESTASI;
    const prItems: PPDBFeeItem[] = Array.isArray(prestasiSource.feeItems) ? prestasiSource.feeItems : DEFAULT_TRACK_PRESTASI.feeItems;
    const prTotal = prItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      enabled: cfg.enabled !== false,
      bankName: cfg.bankName || DEFAULT_PPDB_PAYMENT_CONFIG.bankName,
      bankAccount: cfg.bankAccount || DEFAULT_PPDB_PAYMENT_CONFIG.bankAccount,
      bankHolder: cfg.bankHolder || DEFAULT_PPDB_PAYMENT_CONFIG.bankHolder,
      cashLocation: cfg.cashLocation || DEFAULT_PPDB_PAYMENT_CONFIG.cashLocation,
      cashHours: cfg.cashHours || DEFAULT_PPDB_PAYMENT_CONFIG.cashHours,
      reguler: {
        enabled: regulerSource.enabled !== false,
        title: regulerSource.title || DEFAULT_TRACK_REGULER.title,
        notes: regulerSource.notes ?? DEFAULT_TRACK_REGULER.notes,
        feeItems: regItems,
        totalAmount: regTotal,
      },
      afirmasi: {
        enabled: afirmasiSource.enabled !== false,
        title: afirmasiSource.title || DEFAULT_TRACK_AFIRMASI.title,
        notes: afirmasiSource.notes ?? DEFAULT_TRACK_AFIRMASI.notes,
        feeItems: afItems,
        totalAmount: afTotal,
      },
      prestasi: {
        enabled: prestasiSource.enabled !== false,
        title: prestasiSource.title || DEFAULT_TRACK_PRESTASI.title,
        notes: prestasiSource.notes ?? DEFAULT_TRACK_PRESTASI.notes,
        feeItems: prItems,
        totalAmount: prTotal,
      },
      // Legacy
      title: regulerSource.title || DEFAULT_TRACK_REGULER.title,
      notes: regulerSource.notes ?? DEFAULT_TRACK_REGULER.notes,
      feeItems: regItems,
      totalAmount: regTotal,
    };
  }
  return DEFAULT_PPDB_PAYMENT_CONFIG;
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
