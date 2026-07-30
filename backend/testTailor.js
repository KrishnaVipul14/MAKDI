const { tailorResume } = require('./services/tailoringEngine');
require('dotenv').config();

const profile = { name: "Test User", skills: '["React", "Node"]', years_experience: 2 };
const resumeText = `SUMMARY\nA passionate developer.\nSKILLS\nReact, Node, JS\nEXPERIENCE\n- Built a web app using React.\n- Increased sales by 20%.\nEDUCATION\nUndergrad in CS from ABC Univ.`;
const jobDesc = `We are looking for a Software Engineer with React and Node experience. You will be responsible for building fast, scalable applications. Required: 2+ years of experience.`;

async function run() {
    try {
        console.log("Starting...");
        const res = await tailorResume(resumeText, jobDesc, profile, 'creative', 'Software Engineer');
        console.log(res.tailoredData);
    } catch(e) {
        console.error("FAIL", e);
    }
}
run();
