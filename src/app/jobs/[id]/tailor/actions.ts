'use server'

import prisma from '@/lib/db'
import { getOrCreateUser } from '@/app/actions'
import { parseStructuredResume } from '@/lib/ai-engine'

export async function getTailoredResume(jobId: string) {
  const user = await getOrCreateUser()
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { tailoredResume: true }
  })
  
  if (!job) throw new Error('Job not found')

  const structuredResume = parseStructuredResume(user.resumeText || '')
  
  return {
    job,
    tailored: job.tailoredResume,
    structuredResume
  }
}
