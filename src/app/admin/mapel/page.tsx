import { getSubjects } from './actions';
import MapelClient from './MapelClient';

export const dynamic = 'force-dynamic';

export default async function AdminMapelPage() {
  const { subjects, teachers, students } = await getSubjects();

  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <MapelClient
        initialSubjects={subjects}
        teachers={teachers}
        students={students}
      />
    </main>
  );
}

