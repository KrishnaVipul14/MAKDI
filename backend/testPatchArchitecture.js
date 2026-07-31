const { tailorResumeToTarget } = require('./services/tailoringEngine');

const originalResumeObj = {
  name: "Vipul Pandey",
  title: "Software Development Engineer I",
  contact: {
    phone: "9798840000",
    email: "vipulkrishnaiitp@gmail.com",
    location: "India",
    linkedin: "linkedin.com/in/vipul",
    github: "github.com/vipul",
    leetcode: "leetcode.com/vipul"
  },
  summary: "Experienced software engineer specializing in backend development and scalable microservices. Proven track record of delivering high-quality code in agile environments.",
  skills: {
    "Programming Languages": ["Java", "Python", "C++", "SQL"],
    "Frameworks & Libraries": ["Spring Boot", "React", "Node.js"],
    "Databases & Infra": ["MySQL", "Redis", "AWS"]
  },
  experience: [
    {
      company: "Tech Corp",
      title: "Backend Engineer",
      dates: "2022 - Present",
      bullets: [
        "Developed REST APIs using Spring Boot and Java.",
        "Improved database query performance by 40%.",
        "Collaborated with cross-functional teams."
      ]
    }
  ],
  education: [
    {
      institution: "Indian Institute of Technology",
      degree: "B.Tech in Computer Science",
      dates: "2018 - 2022",
      details: ["CGPA: 9.0"]
    }
  ],
  awards: [
    "Hackathon Winner 2021"
  ],
  projects: []
};

const jobDescription = "We are looking for a Software Engineer with strong experience in Python, AWS, and Node.js. You will be responsible for building REST APIs and microservices. Experience with Redis is a plus.";

async function runTest() {
  console.log("Running Patch-Based Architecture Test...");
  try {
    const result = await tailorResumeToTarget(originalResumeObj, jobDescription, 95);
    const edited = result.editedResumeObject;

    console.log("Patches Applied:", result.patchesApplied);
    
    // Assertions
    const assert = (condition, msg) => {
      if (!condition) throw new Error(`Assertion Failed: ${msg}`);
    };

    assert(edited.name === originalResumeObj.name, "Name mutated");
    assert(edited.title === originalResumeObj.title, "Title mutated");
    assert(JSON.stringify(edited.contact) === JSON.stringify(originalResumeObj.contact), "Contact mutated");
    assert(edited.education.length === originalResumeObj.education.length, "Education count mutated");
    assert(edited.awards.length === originalResumeObj.awards.length, "Awards count mutated");
    assert(edited.experience.length === originalResumeObj.experience.length, "Experience count mutated");
    assert(edited.experience[0].company === originalResumeObj.experience[0].company, "Company name mutated");
    assert(edited.experience[0].dates === originalResumeObj.experience[0].dates, "Dates mutated");
    
    console.log("✅ All architectural invariants passed! The resume was safely patched.");
    console.log("ATS Before:", result.atsScoreBefore);
    console.log("ATS After:", result.atsScoreAfter);
  } catch (e) {
    console.error("❌ Test Failed:", e);
    process.exit(1);
  }
}

runTest();
