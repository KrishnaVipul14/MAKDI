'use server'

import prisma from '@/lib/db'
import { generateMockQuestions, evaluateAnswer } from '@/lib/ai-engine'
import { revalidatePath } from 'next/cache'

export async function createMockSession(formData: FormData) {
  const role = formData.get('role') as string
  const type = formData.get('type') as string

  const questions = generateMockQuestions(role, type)

  const session = await prisma.mockInterview.create({
    data: {
      jobId: 'generic', // For local generic sessions
      type,
      questions: JSON.stringify(questions),
      answers: JSON.stringify(new Array(questions.length).fill('')),
      feedback: JSON.stringify(new Array(questions.length).fill(null)),
    }
  })

  revalidatePath('/interviews')
  return session.id
}

export async function submitAnswer(sessionId: string, index: number, answer: string, question: string) {
  const session = await prisma.mockInterview.findUnique({ where: { id: sessionId } })
  if (!session) return

  const answers = JSON.parse(session.answers || '[]')
  const feedback = JSON.parse(session.feedback || '[]')

  answers[index] = answer
  feedback[index] = evaluateAnswer(question, answer)

  await prisma.mockInterview.update({
    where: { id: sessionId },
    data: {
      answers: JSON.stringify(answers),
      feedback: JSON.stringify(feedback),
    }
  })

  revalidatePath('/interviews')
}

export async function getMockSessions() {
  return await prisma.mockInterview.findMany({ orderBy: { createdAt: 'desc' } })
}
