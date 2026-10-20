'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createJob(data: any) {
  try {
    const newJob = await prisma.jobListing.create({
      data: {
        title: data.title,
        company: data.company,
        location: data.location,
        salary: data.salary,
        type: data.type,
        description: data.description,
        tags: data.tags,
        isHot: data.isHot,
      }
    });
    revalidatePath('/admin/bkk/jobs');
    revalidatePath('/bkk/jobs');
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
        salary: data.salary,
        type: data.type,
        description: data.description,
        tags: data.tags,
        isHot: data.isHot,
      }
    });
    revalidatePath('/admin/bkk/jobs');
    revalidatePath('/bkk/jobs');
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
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
