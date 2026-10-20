import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.alumniId) {
      return NextResponse.json({ error: 'Alumni ID diperlukan' }, { status: 400 });
    }

    const tracer = await prisma.tracerStudy.create({
      data: {
        alumniId: data.alumniId,
        status: data.status,
        companyName: data.companyName || null,
        jobTitle: data.jobTitle || null,
        salary: data.salary || null,
        university: data.university || null,
        faculty: data.faculty || null,
        relevance: data.relevance || null,
        suggestions: data.suggestions || null,
      }
    });

    return NextResponse.json({ success: true, tracer }, { status: 201 });
  } catch (error) {
    console.error('Error creating tracer study:', error);
    return NextResponse.json(
      { error: 'Gagal mengirim data Tracer Study. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
