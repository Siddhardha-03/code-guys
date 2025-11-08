-- ===================================================
-- 1️⃣ Create table: user_quiz_progress
-- ===================================================
CREATE TABLE IF NOT EXISTS user_quiz_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  quiz_id INT NOT NULL,
  status ENUM('attempted', 'completed') DEFAULT 'attempted',
  score INT DEFAULT 0 COMMENT 'Score out of total questions',
  total_questions INT DEFAULT 0,
  attempts_count INT DEFAULT 0,
  best_score INT DEFAULT 0 COMMENT 'Best score achieved',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_quiz (user_id, quiz_id)
);

-- ===================================================
-- 2️⃣ Create table: user_question_progress
-- ===================================================
CREATE TABLE IF NOT EXISTS user_question_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  status ENUM('attempted', 'solved') DEFAULT 'attempted',
  attempts_count INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_question (user_id, question_id)
);

-- ===================================================
-- 3️⃣ Update existing submissions to mark solved ones
-- ===================================================
UPDATE submissions
SET status = 'solved'
WHERE passed = 1;

-- ===================================================
-- 4️⃣ Populate user_question_progress from submissions
-- ===================================================
INSERT INTO user_question_progress (user_id, question_id, status, attempts_count)
SELECT 
  user_id,
  question_id,
  CASE WHEN MAX(passed) = 1 THEN 'solved' ELSE 'attempted' END AS status,
  COUNT(*) AS attempts_count
FROM submissions
GROUP BY user_id, question_id
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  attempts_count = VALUES(attempts_count);

-- ===================================================
-- 5️⃣ Populate user_quiz_progress
-- ===================================================
INSERT INTO user_quiz_progress (
  user_id,
  quiz_id,
  status,
  score,
  total_questions,
  best_score,
  attempts_count
)
SELECT
  agg.user_id,
  agg.quiz_id,
  'completed' AS status,
  COALESCE(latest.score, 0) AS latest_score,
  COALESCE(quiz_stats.total_questions, 0) AS total_questions,
  agg.best_score,
  agg.attempts_count
FROM (
  SELECT
    qs_clean.user_id,
    qs_clean.quiz_id,
    COUNT(*) AS attempts_count,
    MAX(qs_clean.score) AS best_score
  FROM quiz_submissions qs_clean
  GROUP BY qs_clean.user_id, qs_clean.quiz_id
) agg
LEFT JOIN (
  SELECT
    user_id,
    quiz_id,
    MAX(id) AS latest_id
  FROM quiz_submissions
  GROUP BY user_id, quiz_id
) latest_ids ON latest_ids.user_id = agg.user_id AND latest_ids.quiz_id = agg.quiz_id
LEFT JOIN quiz_submissions latest ON latest.id = latest_ids.latest_id
LEFT JOIN (
  SELECT quiz_id, COUNT(*) AS total_questions
  FROM quiz_questions
  GROUP BY quiz_id
) quiz_stats ON quiz_stats.quiz_id = agg.quiz_id
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  score = VALUES(score),
  total_questions = VALUES(total_questions),
  best_score = GREATEST(user_quiz_progress.best_score, VALUES(best_score)),
  attempts_count = VALUES(attempts_count);
