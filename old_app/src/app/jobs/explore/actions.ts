'use server'

import prisma from '@/lib/db'
import { getOrCreateUser } from '@/app/actions'
import { calculateMatchScore } from '@/lib/ai-engine'

// Pre-defined list of premium/known tech companies & YC startups to filter out spam
const PREMIUM_COMPANIES = [
  'Stripe', 'Shopify', 'GitHub', 'Vercel', 'Automattic', 'Canonical', 'Mozilla', 
  'Redis', 'HashiCorp', 'DuckDuckGo', 'GitLab', 'Coinbase', 'Plaid', 'Brex', 
  'Rippling', 'Deel', 'Figma', 'Notion', 'Airtable', 'Scale AI', 'Y Combinator',
  'Discord', 'Reddit', 'Twitch', 'Dropbox', 'Airbnb', 'Uber', 'Lyft', 'DoorDash',
  'Instacart', 'Pinterest', 'Snap', 'Spotify', 'Square', 'Block', 'Robinhood'
]

export async function fetchLiveJobs() {
  try {
    // Fetch live remote software dev jobs from a free, public API (Remotive)
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=100', {
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    const allJobs = data.jobs || []

    // 1. Filter by Premium Companies (strict exact or partial match)
    // To ensure we get enough jobs, we'll accept any job where the company name contains a premium name
    // OR if we want a broader "Verified Startup" list, we take top 20 recent jobs.
    // Let's do a mix: prioritize premium, but fallback to verified if too few.
    
    let premiumJobs = allJobs.filter((job: any) => 
      PREMIUM_COMPANIES.some(premium => 
        job.company_name.toLowerCase().includes(premium.toLowerCase())
      )
    )

    // If API doesn't have enough premium companies today, just take the top 15 most recent verified jobs
    if (premiumJobs.length < 5) {
      premiumJobs = allJobs.slice(0, 15)
    } else {
      premiumJobs = premiumJobs.slice(0, 15)
    }

    const user = await getOrCreateUser()
    const userSkills = user.baseSkills ? JSON.parse(user.baseSkills) : []

    // Format and calculate match score for each
    const formattedJobs = premiumJobs.map((job: any) => {
      // Clean HTML from description for scoring
      const cleanDesc = job.description.replace(/<[^>]*>?/gm, '')
      const match = calculateMatchScore(userSkills, cleanDesc)
      
      return {
        id: job.id.toString(),
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location,
        type: job.job_type,
        url: job.url,
        description: cleanDesc, // Raw text for UI
        logo: job.company_logo,
        matchScore: match.score,
        missingSkills: match.missingSkills
      }
    })

    // Sort by highest match score
    return formattedJobs.sort((a: any, b: any) => b.matchScore - a.matchScore)

  } catch (e) {
    console.error('Failed to fetch live jobs:', e)
    return []
  }
}

export async function saveJobToDashboard(jobData: any) {
  const user = await getOrCreateUser()
  
  await prisma.job.create({
    data: {
      userId: user.id,
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      matchScore: jobData.matchScore,
      skillGap: JSON.stringify(jobData.missingSkills)
    }
  })
}
