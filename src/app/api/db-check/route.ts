import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rawUrl = process.env.POSTGRES_PRISMA_DATABASE_URL || process.env.DATABASE_URL || '';
  // Mask sensitive parts: keep only protocol and first 8 chars of username
  const masked = rawUrl.replace(/:\/\/([^:@]{8})[^:@]*:[^@]+@/, '://$1***:***@');

  try {
    const start = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as test, current_database() as db;`;
    const duration = Date.now() - start;

    return NextResponse.json({
      status: 'CONNECTED',
      durationMs: duration,
      maskedUrl: masked,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      maskedUrl: masked,
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
    }, { status: 500 });
  }
}
