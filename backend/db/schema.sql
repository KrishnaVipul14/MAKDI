CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  phone TEXT, location TEXT,
  education_level TEXT,
  years_experience REAL,
  preferred_roles TEXT,        -- store as JSON string
  preferred_locations TEXT,    -- JSON string
  remote_preference TEXT,
  salary_min INTEGER, salary_max INTEGER,
  skills TEXT                  -- JSON string array
);

CREATE TABLE resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  file_path TEXT, parsed_text TEXT,
  parsed_skills TEXT, parsed_education TEXT,
  parsed_experience_years REAL,
  is_default INTEGER DEFAULT 0,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT, source TEXT,
  title TEXT, company TEXT, location TEXT,
  remote_type TEXT, description TEXT,
  requirements_text TEXT, min_experience REAL,
  education_required TEXT, salary_range TEXT,
  apply_url TEXT, posted_date DATETIME,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(external_id, source)
);

CREATE TABLE match_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  job_id INTEGER REFERENCES jobs(id),
  score REAL, matched_skills TEXT, missing_skills TEXT,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tailored_resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  job_id INTEGER REFERENCES jobs(id),
  resume_id INTEGER REFERENCES resumes(id),
  tailored_pdf_path TEXT, tailored_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  job_id INTEGER REFERENCES jobs(id),
  status TEXT DEFAULT 'saved',
  applied_at DATETIME, notes TEXT
);

CREATE TABLE cover_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  job_id INTEGER REFERENCES jobs(id),
  content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
