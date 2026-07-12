/**
 * Custom Algorithmic AI Engine (100% Free & Local)
 * Simulates advanced LLM capabilities for Job Matching, Tailoring, and Mock Interviews
 * using keyword extraction, heuristic scoring, and a predefined knowledge base.
 */

const TECH_KEYWORDS = [
  'react', 'next.js', 'typescript', 'javascript', 'node.js', 'python', 'java', 'c++', 'go',
  'sql', 'postgresql', 'mongodb', 'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'git',
  'machine learning', 'ai', 'data structures', 'algorithms', 'system design', 'rest api', 'graphql'
];

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return TECH_KEYWORDS.filter(k => lower.includes(k));
}

export function calculateMatchScore(resumeSkills: string[], jobDescription: string): {
  score: number;
  missingSkills: string[];
} {
  const lowerDesc = jobDescription.toLowerCase();
  const jobRequiredSkills = TECH_KEYWORDS.filter(k => lowerDesc.includes(k));
  
  if (jobRequiredSkills.length === 0) return { score: 85, missingSkills: [] };
  
  let matchCount = 0;
  const missingSkills: string[] = [];
  
  for (const req of jobRequiredSkills) {
    if (resumeSkills.includes(req)) {
      matchCount++;
    } else {
      missingSkills.push(req);
    }
  }
  
  const score = Math.min(100, Math.round((matchCount / jobRequiredSkills.length) * 100));
  return { score, missingSkills };
}

export function generateTailoredSuggestions(jobTitle: string, missingSkills: string[]) {
  const suggestions = [
    `Emphasize your experience related to ${jobTitle.split(' ')[0]} development.`,
  ];
  if (missingSkills.length > 0) {
    suggestions.push(`Consider adding a project demonstrating your skills in: ${missingSkills.slice(0, 3).join(', ')}.`);
    suggestions.push(`Quantify your achievements using metrics (e.g., "Improved latency by 40%").`);
  } else {
    suggestions.push(`Your profile is a great match! Ensure your contact details and portfolio links are prominent.`);
  }
  return suggestions;
}

export function generateMockQuestions(role: string, type: string): string[] {
  const lowerRole = role.toLowerCase();
  if (type === 'HR') {
    return [
      "Tell me about yourself and why you're interested in this role.",
      "Describe a time you overcame a significant challenge in a project.",
      "Where do you see yourself in 3 years?"
    ];
  }
  if (type === 'Technical') {
    if (lowerRole.includes('frontend') || lowerRole.includes('react')) {
      return [
        "Explain the virtual DOM and how React handles reconciliation.",
        "What are React Hooks? Can you explain useEffect?",
        "How do you optimize the performance of a React application?"
      ];
    }
    if (lowerRole.includes('backend') || lowerRole.includes('node')) {
      return [
        "Explain how Node.js handles asynchronous operations.",
        "What is the difference between SQL and NoSQL databases?",
        "How would you design a scalable REST API?"
      ];
    }
    return [
      "Explain a complex technical concept you recently learned.",
      "How do you approach debugging a critical issue in production?",
      "Describe your favorite programming language and its drawbacks."
    ];
  }
  return ["Can you walk me through your most impressive project?"];
}

export function evaluateAnswer(question: string, answer: string): { score: number; feedback: string } {
  if (answer.length < 10) {
    return { score: 20, feedback: "Your answer is too brief. Please provide more detail and context." };
  }
  if (answer.length > 300) {
    return { score: 90, feedback: "Excellent detail! You provided a comprehensive and thoughtful response." };
  }
  return { score: 75, feedback: "Good answer. Try to incorporate specific examples from your past experience to make it stronger." };
}
