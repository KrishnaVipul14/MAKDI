'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getDSAQuestions() {
  const count = await prisma.dSAQuestion.count()
  
  if (count === 0) {
    // Seed initial questions
    await prisma.dSAQuestion.createMany({
      data: [
        { title: 'Two Sum', difficulty: 'Easy', description: 'Find two numbers that add up to a target.', company: 'Google', role: 'Software Engineer' },
        { title: 'Merge Intervals', difficulty: 'Medium', description: 'Merge overlapping intervals.', company: 'Meta', role: 'Software Engineer' },
        { title: 'LRU Cache', difficulty: 'Medium', description: 'Design a Least Recently Used (LRU) cache.', company: 'Amazon', role: 'Backend Engineer' },
      ]
    })
  }

  return await prisma.dSAQuestion.findMany()
}

export async function toggleDSAStatus(id: string, currentStatus: string) {
  await prisma.dSAQuestion.update({
    where: { id },
    data: { status: currentStatus === 'Solved' ? 'Unsolved' : 'Solved' }
  })
  revalidatePath('/dsa')
}
