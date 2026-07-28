const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const { initJobAggregator } = require('./services/jobAggregator');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB and Start Server
getDb().then(db => {
  app.locals.db = db;
  
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/profile', require('./routes/profile'));
  app.use('/api/resume', require('./routes/resume'));
  app.use('/api/jobs', require('./routes/jobs'));
  app.use('/api/tailor', require('./routes/tailor'));
  app.use('/api/applications', require('./routes/applications'));
  
  // Serve static PDF uploads
  app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

  // Base Route
  app.get('/', (req, res) => {
    res.json({ message: 'MAKDI Backend Running' });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initJobAggregator(db);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
