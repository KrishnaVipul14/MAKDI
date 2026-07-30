const fs = require('fs');
const path = require('path');
const natural = require('natural');

const knownReputableCompaniesList = JSON.parse(fs.readFileSync(path.join(__dirname, '../knownReputableCompaniesList.json'), 'utf-8'));
const blocklistedCompanies = JSON.parse(fs.readFileSync(path.join(__dirname, '../blocklistedCompanies.json'), 'utf-8'));

function isCompanyTrusted(companyName, companyDomain, jobData) {
  const hasRealDomain = companyDomain && !["gmail.com", "yahoo.com", "hotmail.com"].includes(companyDomain.toLowerCase());

  const desc = jobData.description || "";
  const hasSubstantiveDescription = desc.length > 200 &&
    !/urgent hiring|work from home.*earn.*daily|no experience.*high salary/i.test(desc);

  const spamPatterns = /pyramid|mlm|multi-level marketing|investment required|registration fee|pay to apply/i;
  const isNotSpam = !spamPatterns.test(desc);

  const isNotBlocklisted = !blocklistedCompanies.includes((companyName || "").toLowerCase());

  return hasRealDomain && hasSubstantiveDescription && isNotSpam && isNotBlocklisted;
}

function titleSimilarity(title1, title2) {
  return natural.JaroWinklerDistance(title1.toLowerCase(), title2.toLowerCase());
}

function isDuplicateOrBulkPosting(newJob, existingJobs) {
  const similar = existingJobs.filter(j =>
    j.company === newJob.company &&
    titleSimilarity(j.title, newJob.title) > 0.85 &&
    Math.abs(new Date(j.posted_date) - new Date(newJob.posted_date)) < 7 * 24 * 60 * 60 * 1000
  );
  return similar.length > 0;
}

function computeCompanyTier(companyName, jobData, companyDomain) {
  if (["greenhouse", "lever"].includes(jobData.source?.toLowerCase())) return "verified";
  if (knownReputableCompaniesList.includes((companyName || "").toLowerCase())) return "verified";
  
  if (isCompanyTrusted(companyName, companyDomain, jobData)) return "standard";
  
  return "unverified";
}

module.exports = {
  isCompanyTrusted,
  isDuplicateOrBulkPosting,
  computeCompanyTier,
  titleSimilarity
};
