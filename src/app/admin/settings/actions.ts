'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PPDBFeeItem, PPDBPaymentConfig, DEFAULT_PPDB_PAYMENT_CONFIG } from './types';

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
    const items: PPDBFeeItem[] = Array.isArray(cfg.feeItems) ? cfg.feeItems : DEFAULT_PPDB_PAYMENT_CONFIG.feeItems;
    const computedTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return {
      enabled: cfg.enabled !== false,
      title: cfg.title || DEFAULT_PPDB_PAYMENT_CONFIG.title,
      bankName: cfg.bankName || DEFAULT_PPDB_PAYMENT_CONFIG.bankName,
      bankAccount: cfg.bankAccount || DEFAULT_PPDB_PAYMENT_CONFIG.bankAccount,
      bankHolder: cfg.bankHolder || DEFAULT_PPDB_PAYMENT_CONFIG.bankHolder,
      cashLocation: cfg.cashLocation || DEFAULT_PPDB_PAYMENT_CONFIG.cashLocation,
      cashHours: cfg.cashHours || DEFAULT_PPDB_PAYMENT_CONFIG.cashHours,
      notes: cfg.notes || DEFAULT_PPDB_PAYMENT_CONFIG.notes,
      feeItems: items,
      totalAmount: computedTotal || DEFAULT_PPDB_PAYMENT_CONFIG.totalAmount,
    };
  }
  return DEFAULT_PPDB_PAYMENT_CONFIG;
}

export async function savePPDBPaymentConfig(paymentConfig: PPDBPaymentConfig) {
  try {
    const current = (await getWebSettings()) || {};
    const computedTotal = (paymentConfig.feeItems || []).reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    const sanitizedConfig = {
      ...paymentConfig,
      totalAmount: computedTotal,
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
