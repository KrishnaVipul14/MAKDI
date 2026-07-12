'use server'

import prisma from '@/lib/db'
import { extractSkills } from '@/lib/ai-engine'
import { getOrCreateUser } from '@/app/actions'
import { revalidatePath } from 'next/cache'

export async function uploadResume(formData: FormData) {
  const text = formData.get('resumeText') as string
  if (!text) return { error: 'No text provided' }

  const skills = extractSkills(text)
  const user = await getOrCreateUser()

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resumeText: text,
      baseSkills: JSON.stringify(skills),
      readinessScore: 30, // Base score for uploading resume
    }
  })

  revalidatePath('/resume')
  revalidatePath('/')
  return { success: true }
}

export async function getResumeData() {
  const user = await getOrCreateUser()
  return {
    resumeText: user.resumeText,
    skills: user.baseSkills ? JSON.parse(user.baseSkills) : []
  }
}
