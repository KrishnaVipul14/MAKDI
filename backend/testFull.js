// Full end-to-end test: upload a fake session then call tailor
require('dotenv').config();
const { getDb } = require('./db');
const { tailorResume } = require('./services/tailoringEngine');
const { buildResumeHtml, generatePdfFromHtml } = require('./services/pdfGenerator');

const RESUME_TEXT = `
Vipul Krishna
vipulkrishnaiitp@gmail.com | 9798840000 | India

SUMMARY
Android Developer with 2 years of experience building high-performance mobile apps.

SKILLS
Kotlin, Java, Android SDK, Jetpack Compose, MVVM, Retrofit, Firebase, Git, REST APIs

EXPERIENCE
- Developed a real-time chat application using Firebase and Kotlin with 10,000+ downloads.
- Built and published 3 Android apps on the Play Store achieving 4.5+ star ratings.
- Reduced app crash rate by 40% by implementing robust error handling and testing.
- Integrated payment gateway (Razorpay) into an e-commerce Android app.

EDUCATION
B.Tech in Computer Science, IIT Patna, 2023
`;

const JD = `
We are looking for an Android Developer to join our team.
Requirements:
- 1+ years of Android development experience
- Proficiency in Kotlin and Java
- Experience with Jetpack Compose, MVVM architecture
- Familiarity with REST APIs and Firebase
- Published apps on Google Play Store preferred
`;

async function runTest() {
  console.log('--- Step 1: Tailoring Engine ---');
  const profile = {
    name: 'Vipul Krishna',
    email: 'vipulkrishnaiitp@gmail.com',
    phone: '9798840000',
    location: 'India',
    years_experience: 2,
    education_level: 'Undergrad',
    parsed_skills: JSON.stringify(['Kotlin','Java','Android SDK','Firebase'])
  };

  try {
    const result = await tailorResume(RESUME_TEXT, JD, profile, 'creative', 'Android Developer');
    console.log('✅ Tailoring SUCCESS');
    console.log('Summary:', result.tailoredData.summary?.substring(0, 80) + '...');
    console.log('Skills:', result.tailoredData.skills?.slice(0,5).join(', '));
    console.log('Bullets:', result.tailoredData.experience_bullets?.length, 'bullets');
    console.log('ATS Before:', result.ats_score_before, '→ After:', result.ats_score_after);

    console.log('\n--- Step 2: PDF Generation ---');
    const html = buildResumeHtml(profile, result.tailoredData);
    const pdfPath = await generatePdfFromHtml(html, 'test_full_tailor.pdf');
    console.log('✅ PDF generated:', pdfPath);
  } catch(e) {
    console.error('❌ ERROR:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

runTest();
