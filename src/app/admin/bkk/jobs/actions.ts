'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createJob(data: any) {
  try {
    const newJob = await prisma.jobListing.create({
      data: {
        title: data.title,
        company: data.company,
        location: data.location,
        salary: data.salary || null,
        type: data.type || 'Full-time',
        description: data.description,
        requirements: data.requirements || null,
        tags: data.tags || '',
        department: data.department || 'Semua Jurusan',
        contactEmail: data.contactEmail || null,
        contactWa: data.contactWa || null,
        isHot: Boolean(data.isHot),
      }
    });
    revalidatePath('/admin/bkk/jobs');
    revalidatePath('/bkk/jobs');
    revalidatePath('/bkk');
    return { success: true, data: newJob };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateJob(id: string, data: any) {
  try {
    const updated = await prisma.jobListing.update({
      where: { id },
      data: {
        title: data.title,
        company: data.company,
        location: data.location,
        salary: data.salary || null,
        type: data.type || 'Full-time',
        description: data.description,
        requirements: data.requirements || null,
        tags: data.tags || '',
        department: data.department || 'Semua Jurusan',
        contactEmail: data.contactEmail || null,
        contactWa: data.contactWa || null,
        isHot: Boolean(data.isHot),
      }
    });
    revalidatePath('/admin/bkk/jobs');
    revalidatePath('/bkk/jobs');
    revalidatePath('/bkk');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteJob(id: string) {
  try {
    await prisma.jobListing.delete({
      where: { id }
    });
    revalidatePath('/admin/bkk/jobs');
    revalidatePath('/bkk/jobs');
    revalidatePath('/bkk');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getJobApplications(jobId?: string) {
  try {
    const applications = await prisma.jobApplication.findMany({
      where: jobId ? { jobId } : undefined,
      include: {
        job: {
          select: {
            title: true,
            company: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: applications };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateApplicationStatus(id: string, status: string, adminNotes?: string) {
  try {
    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes !== undefined ? adminNotes : undefined
      }
    });
    revalidatePath('/admin/bkk/jobs');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteApplication(id: string) {
  try {
    await prisma.jobApplication.delete({
      where: { id }
    });
    revalidatePath('/admin/bkk/jobs');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
