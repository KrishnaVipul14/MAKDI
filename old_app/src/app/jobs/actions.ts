'use server'

import prisma from '@/lib/db'
import { getOrCreateUser } from '@/app/actions'
import { calculateMatchScore, generateTailoredSuggestions } from '@/lib/ai-engine'
import { revalidatePath } from 'next/cache'

export async function addJob(formData: FormData) {
  const title = formData.get('title') as string
  const company = formData.get('company') as string
  const description = formData.get('description') as string

  if (!title || !company || !description) return { error: 'All fields required' }

  const user = await getOrCreateUser()
  const userSkills = user.baseSkills ? JSON.parse(user.baseSkills) : []

  const { score, missingSkills } = calculateMatchScore(userSkills, description)

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      title,
      company,
      description,
      matchScore: score,
      skillGap: JSON.stringify(missingSkills),
      salaryInsights: 'Based on market data: $100k - $150k',
    }
  })

  // Auto-generate Tailored Resume
  const suggestions = generateTailoredSuggestions(title, missingSkills)
  await prisma.tailoredResume.create({
    data: {
      jobId: job.id,
      atsScore: Math.min(95, score + 15),
      missingKeywords: JSON.stringify(missingSkills),
      suggestions: JSON.stringify(suggestions),
    }
  })

  revalidatePath('/jobs')
  revalidatePath('/')
  return { success: true }
}

export async function getJobs() {
  const user = await getOrCreateUser()
  return await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  })
}
