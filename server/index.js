require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

// Import routes
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const submissionRoutes = require('./routes/submissions');
const quizRoutes = require('./routes/quizzes');
const compilerRoutes = require('./routes/compiler');
const adminRoutes = require('./routes/admin');
const codeDraftRoutes = require('./routes/codeDrafts');

const app = express();

// Middleware

// Dynamic CORS: derive allowed origins from CLIENT_URL env (comma-separated)
// Example .env:
// CLIENT_URL=https://code-guys-1.onrender.com,http://localhost:3000
const rawOrigins = process.env.CLIENT_URL || 'https://code-guys-1.onrender.com,http://localhost:3000';
const allowedOrigins = rawOrigins
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);
console.log('[CORS] Allowed origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl) and health checks
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed from this origin: ' + origin), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ensure DB schema
async function ensureDatabaseSchema() {
  const connection = await pool.getConnection();
  try {
    const [exampleColumn] = await connection.query("SHOW COLUMNS FROM questions LIKE 'examples'");
    if (exampleColumn.length === 0) {
      console.log("[DB] Adding missing 'examples' column");
      await connection.query("ALTER TABLE questions ADD COLUMN examples JSON NULL");
    }

    const [languageSupportedColumn] = await connection.query("SHOW COLUMNS FROM questions LIKE 'language_supported'");
    if (languageSupportedColumn.length === 0) {
      console.log("[DB] Adding missing 'language_supported' column");
      await connection.query("ALTER TABLE questions ADD COLUMN language_supported JSON NULL");
    }

    const [tagsColumn] = await connection.query("SHOW COLUMNS FROM questions LIKE 'tags'");
    if (tagsColumn.length === 0) {
      console.log("[DB] Adding missing 'tags' column");
      await connection.query("ALTER TABLE questions ADD COLUMN tags JSON NULL");
    }
  } catch (err) {
    console.error('[DB] Schema verification failed:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

// Make db available to all routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/compiler', compilerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/code-drafts', codeDraftRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong on the server',
  });
});

// Start server
ensureDatabaseSchema()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Failed to ensure schema. Shutting down.', err);
    process.exit(1);
  });
