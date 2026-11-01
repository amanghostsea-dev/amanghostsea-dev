'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getManagedClasses, saveManagedClasses, SchoolClassItem } from '@/lib/kelas-service';

export async function createJurusan(data: any) {
  try {
    const code = (data.code || '').trim().toUpperCase();
    const newJurusan = await prisma.jurusan.create({
      data: {
        name: data.name.trim(),
        code,
        kuota: parseInt(data.kuota) || 0,
        description: data.description || '',
      },
    });

    // Otomatis buatkan rombel kelas standar (X, XI, XII) untuk jurusan baru ini
    try {
      const currentClasses = await getManagedClasses();
      const levels: ('X' | 'XI' | 'XII')[] = ['X', 'XI', 'XII'];
      const updatedClasses = [...currentClasses];

      for (const lvl of levels) {
        const classId = `cls-${lvl.toLowerCase()}-${code.toLowerCase()}-1`;
        if (!updatedClasses.some(c => c.id === classId || c.name === `${lvl} ${code} 1`)) {
          updatedClasses.push({
            id: classId,
            name: `${lvl} ${code} 1`,
            level: lvl,
            jurusanCode: code,
            rombel: 1,
            waliKelas: 'Guru Pengampu',
            room: `Ruang ${code} ${lvl}`,
            capacity: 36,
          });
        }
      }
      await saveManagedClasses(updatedClasses);
    } catch (e) {
      console.error('Error auto-creating classes for new jurusan:', e);
    }

    revalidatePath('/admin/jurusan');
    revalidatePath('/admin/mapel');
    revalidatePath('/admin/users');
    revalidatePath('/admin/cbt');
    revalidatePath('/admin/tugas');
    revalidatePath('/portal/guru/kelas');
    revalidatePath('/ppdb');
    revalidatePath('/');
    return { success: true, data: newJurusan };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateJurusan(id: string, data: any) {
  try {
    const updated = await prisma.jurusan.update({
      where: { id },
      data: {
        name: data.name,
        code: (data.code || '').trim().toUpperCase(),
        kuota: parseInt(data.kuota) || 0,
        description: data.description || '',
      },
    });
    revalidatePath('/admin/jurusan');
    revalidatePath('/admin/mapel');
    revalidatePath('/admin/users');
    revalidatePath('/admin/cbt');
    revalidatePath('/admin/tugas');
    revalidatePath('/portal/guru/kelas');
    revalidatePath('/ppdb');
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteJurusan(id: string) {
  try {
    const j = await prisma.jurusan.findUnique({ where: { id } });
    await prisma.jurusan.delete({
      where: { id },
    });

    // Bersihkan rombel kelas jurusan yang dihapus
    if (j?.code) {
      try {
        const currentClasses = await getManagedClasses();
        const filtered = currentClasses.filter(c => c.jurusanCode.toUpperCase() !== j.code.toUpperCase());
        await saveManagedClasses(filtered);
      } catch (err) {
        console.error('Error cleaning up classes on jurusan delete:', err);
      }
    }

    revalidatePath('/admin/jurusan');
    revalidatePath('/admin/mapel');
    revalidatePath('/admin/users');
    revalidatePath('/admin/cbt');
    revalidatePath('/admin/tugas');
    revalidatePath('/portal/guru/kelas');
    revalidatePath('/ppdb');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function saveClassAction(data: {
  id?: string;
  level: 'X' | 'XI' | 'XII';
  jurusanCode: string;
  rombel: number;
  waliKelas?: string | null;
  waliKelasId?: string | null;
  room?: string | null;
  capacity?: number;
}) {
  try {
    const currentClasses = await getManagedClasses();
    const jurusanCode = data.jurusanCode.trim().toUpperCase();
    const rombel = Number(data.rombel) || 1;
    const name = `${data.level} ${jurusanCode} ${rombel}`;
    const capacity = Number(data.capacity) || 36;
    const id = data.id || `cls-${data.level.toLowerCase()}-${jurusanCode.toLowerCase()}-${rombel}-${Date.now().toString().slice(-4)}`;

    const classItem: SchoolClassItem = {
      id,
      name,
      level: data.level,
      jurusanCode,
      rombel,
      waliKelas: data.waliKelas?.trim() || 'Belum Ditentukan',
      waliKelasId: data.waliKelasId || null,
      room: data.room?.trim() || `Ruang ${jurusanCode}`,
      capacity,
    };

    let updatedList: SchoolClassItem[] = [];
    if (data.id) {
      updatedList = currentClasses.map(c => c.id === data.id ? classItem : c);
    } else {
      // Periksa apakah nama kelas sudah ada
      if (currentClasses.some(c => c.name.toUpperCase() === name.toUpperCase())) {
        return { error: `Kelas "${name}" sudah terdaftar di sistem.` };
      }
      updatedList = [...currentClasses, classItem];
    }

    // Urutkan kelas berdasarkan Jenjang X -> XI -> XII dan Kode Jurusan
    const levelOrder: Record<string, number> = { 'X': 1, 'XI': 2, 'XII': 3 };
    updatedList.sort((a, b) => {
      const lA = levelOrder[a.level] || 9;
      const lB = levelOrder[b.level] || 9;
      if (lA !== lB) return lA - lB;
      if (a.jurusanCode !== b.jurusanCode) return a.jurusanCode.localeCompare(b.jurusanCode);
      return a.rombel - b.rombel;
    });

    await saveManagedClasses(updatedList);

    revalidatePath('/admin/jurusan');
    revalidatePath('/admin/mapel');
    revalidatePath('/admin/users');
    revalidatePath('/admin/cbt');
    revalidatePath('/admin/tugas');
    revalidatePath('/portal/guru/kelas');

    return { success: true, data: classItem };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteClassAction(classId: string) {
  try {
    const currentClasses = await getManagedClasses();
    const filtered = currentClasses.filter(c => c.id !== classId);
    await saveManagedClasses(filtered);

    revalidatePath('/admin/jurusan');
    revalidatePath('/admin/mapel');
    revalidatePath('/admin/users');
    revalidatePath('/admin/cbt');
    revalidatePath('/admin/tugas');
    revalidatePath('/portal/guru/kelas');

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
