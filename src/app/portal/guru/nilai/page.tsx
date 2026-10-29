import { getTeacherGradingData } from './actions';
import GuruNilaiClient from './GuruNilaiClient';

export const dynamic = 'force-dynamic';

export default async function GuruNilaiPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const { subjects, activeSubject, grades, teacherName } = await getTeacherGradingData(
    resolvedParams.subjectId
  );

  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <GuruNilaiClient
        subjects={subjects}
        activeSubject={activeSubject}
        initialGrades={grades}
        teacherName={teacherName}
      />
    </main>
  );
}

