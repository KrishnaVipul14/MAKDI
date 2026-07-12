'use server'

import prisma from '@/lib/db'

export async function getOrCreateUser() {
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Guest User',
        experienceLevel: 'Entry Level',
        readinessScore: 0,
      }
    })
  }
  return user
}

export async function getDashboardStats() {
  const user = await getOrCreateUser()
  const activeJobs = await prisma.job.count({
    where: { status: { in: ['Applying', 'Interviewing'] } }
  })
  const dsaSolved = await prisma.dSAQuestion.count({
    where: { status: 'Solved' }
  })
  const recentJobs = await prisma.job.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 3
  })
  
  return { user, activeJobs, dsaSolved, recentJobs }
}
