require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Utility function to safely add column if it doesn't exist
async function safeAddColumn(connection, table, column, definition) {
  const [rows] = await connection.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
  `, [process.env.DB_NAME, table, column]);

  if (rows.length === 0) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
    console.log(`✅ Added column "${column}" to table "${table}"`);
  } else {
    console.log(`ℹ️ Column "${column}" already exists in table "${table}". Skipping...`);
  }
}

const runMigration = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Connected to database successfully');

    // Step 1: Add missing columns safely
    await safeAddColumn(connection, 'questions', 'function_name', `function_name VARCHAR(255) NULL AFTER title`);
    await safeAddColumn(connection, 'quizzes', 'duration', `duration INT DEFAULT 60 COMMENT 'Quiz duration in minutes'`);
    await safeAddColumn(connection, 'submissions', 'status', `status ENUM('attempted', 'solved') DEFAULT 'attempted'`);
    await safeAddColumn(connection, 'users', 'last_signed_in', `last_signed_in TIMESTAMP NULL COMMENT 'Last time user signed in'`);

    // Step 2: Read and run the remaining SQL statements from migration files
    const migrationFiles = ['add_quiz_duration.sql', 'add_function_name.sql', 'add_code_drafts.sql'];

    for (const file of migrationFiles) {
      const migrationPath = path.join(__dirname, '..', 'database', file);

      if (!fs.existsSync(migrationPath)) {
        console.warn(`⚠️  Migration file ${file} not found. Skipping...`);
        continue;
      }

      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      const statements = migrationSQL
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(Boolean);

      console.log(`📦 Running ${statements.length} statements from ${file}...`);

      for (const [i, statement] of statements.entries()) {
        try {
          console.log(`🟡 [${file}] Statement ${i + 1}: ${statement.slice(0, 80)}...`);
          await connection.query(statement);
          console.log(`✅ [${file}] Statement ${i + 1} executed successfully\n`);
        } catch (stmtError) {
          console.error(`❌ Error in ${file} statement ${i + 1}:`, stmtError.message);
          throw stmtError;
        }
      }
    }

    await connection.end();
    console.log('🎉 Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();
