'use server'

import prisma from '@/lib/db'

export async function getTailoredResume(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { tailoredResume: true }
  })
  
  if (!job) throw new Error('Job not found')
  
  return {
    job,
    tailored: job.tailoredResume
  }
}
