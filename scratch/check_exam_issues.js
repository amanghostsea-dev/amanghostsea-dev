const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExams() {
  const exams = await prisma.exam.findMany({
    include: {
      questions: {
        select: { id: true, questionText: true }
      }
    }
  });

  console.log('Total exams:', exams.length);
  for (const ex of exams) {
    const textCounts = {};
    let dupes = 0;
    for (const q of ex.questions) {
      const clean = q.questionText.trim().toLowerCase();
      textCounts[clean] = (textCounts[clean] || 0) + 1;
      if (textCounts[clean] === 2) {
        dupes++;
      }
    }
    if (dupes > 0 || !ex.shuffleQuestions) {
      console.log(`Exam [${ex.id}] "${ex.title}": ${ex.questions.length} questions, ${dupes} duplicate questions, shuffleQuestions=${ex.shuffleQuestions}`);
      if (dupes > 5) {
        // Find most common question text
        for (const [text, count] of Object.entries(textCounts)) {
          if (count > 2) {
            console.log(`  -> Repeated ${count}x: "${text.substring(0, 60)}..."`);
          }
        }
      }
    }
  }
}

checkExams().finally(() => prisma.$disconnect());
