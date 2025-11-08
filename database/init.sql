-- Initialize the database schema for the Campus Coding Platform

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS campus_platform;

-- Use the database
USE campus_platform;

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password TEXT,
  role ENUM('student', 'admin'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coding Questions
CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title TEXT,
  function_name VARCHAR(255),
  description TEXT,
  examples JSON,
  difficulty ENUM('Easy', 'Medium', 'Hard'),
  language_supported JSON,
  tags JSON,
  question_type ENUM('array', 'string', 'primitives', 'math', 'matrix', 'linked_list', 'binary_tree', 'graph', 'custom_class') NULL,
  parameter_schema JSON,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Test Cases
CREATE TABLE test_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT,
  input TEXT,
  expected_output TEXT,
  hidden BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Submissions
CREATE TABLE submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  question_id INT,
  code TEXT,
  language VARCHAR(50),
  passed BOOLEAN,
  test_case_results JSON,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Quizzes
CREATE TABLE quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  scheduled_time DATETIME,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Quiz Questions (MCQs)
CREATE TABLE quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT,
  question TEXT,
  options JSON,
  correct_option INT,
  difficulty VARCHAR(50),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

-- Quiz Submissions
CREATE TABLE quiz_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  quiz_id INT,
  score INT,
  answers JSON,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

-- User Quiz Progress
CREATE TABLE user_quiz_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  quiz_id INT NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  score INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  attempts_count INT DEFAULT 0,
  best_score INT DEFAULT 0,
  UNIQUE KEY uq_user_quiz (user_id, quiz_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

-- Insert a default admin user
INSERT INTO users (name, email, password, role) VALUES 
('Admin', 'admin@example.com', '$2a$10$mjTzz/qYKgvtwFtFEjaoOeK4j5Jb.vuygrpkry5M6RSGjzqV9kbca', 'admin');
-- Default password is 'admin123' (hashed with bcryptjs)

-- Insert some sample coding questions
INSERT INTO questions (title, function_name, description, examples, difficulty, language_supported, tags, question_type, parameter_schema, created_by) VALUES
('Two Sum', 'twoSum', '<h3>Problem Description</h3><p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to target</em>.</p><p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p><p>You can return the answer in any order.</p><h3>Constraints</h3><ul><li>2 ≤ nums.length ≤ 10<sup>4</sup></li><li>-10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup></li><li>-10<sup>9</sup> ≤ target ≤ 10<sup>9</sup></li><li>Only one valid answer exists.</li></ul>', '[{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."}, {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."}, {"input": "nums = [3,3]", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 6, we return [0, 1]."}]', 'Easy', '{"languages": ["javascript", "python", "java", "cpp"]}', '{"tags": ["array", "hash table"]}', 'array', '{"params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returnType":"int[]"}', 1),
('Reverse String', 'reverseString', '<h3>Problem Description</h3><p>Write a function that reverses a string. The input string is given as an array of characters <code>s</code>.</p><p>You must do this by modifying the input array <strong>in-place</strong> with <code>O(1)</code> extra memory.</p><h3>Constraints</h3><ul><li>1 ≤ s.length ≤ 10<sup>5</sup></li><li><code>s[i]</code> is a printable ascii character.</li></ul>', '[{"input": "s = [\"h\",\"e\",\"l\",\"l\",\"o\"]", "output": "[\"o\",\"l\",\"l\",\"e\",\"h\"]", "explanation": "The string is reversed in-place."}, {"input": "s = [\"H\",\"a\",\"n\",\"n\",\"a\",\"h\"]", "output": "[\"h\",\"a\",\"n\",\"n\",\"a\",\"H\"]", "explanation": "The string \"Hannah\" becomes \"hannaH\" when reversed."}]', 'Easy', '{"languages": ["javascript", "python", "java", "cpp"]}', '{"tags": ["string", "two pointers"]}', 'string', '{"params":[{"name":"s","type":"char[]"}],"returnType":"void"}', 1),
('Fibonacci Number', 'fib', '<h3>Problem Description</h3><p>The <strong>Fibonacci numbers</strong>, commonly denoted <code>F(n)</code> form a sequence, called the <strong>Fibonacci sequence</strong>, such that each number is the sum of the two preceding ones, starting from <code>0</code> and <code>1</code>. That is:</p><pre>F(0) = 0, F(1) = 1<br>F(n) = F(n - 1) + F(n - 2), for n > 1.</pre><p>Given <code>n</code>, calculate <code>F(n)</code>.</p><h3>Constraints</h3><ul><li>0 ≤ n ≤ 30</li></ul>', '[{"input": "n = 2", "output": "1", "explanation": "F(2) = F(1) + F(0) = 1 + 0 = 1."}, {"input": "n = 3", "output": "2", "explanation": "F(3) = F(2) + F(1) = 1 + 1 = 2."}, {"input": "n = 4", "output": "3", "explanation": "F(4) = F(3) + F(2) = 2 + 1 = 3."}]', 'Medium', '{"languages": ["javascript", "python", "java", "cpp"]}', '{"tags": ["recursion", "dynamic programming"]}', 'math', '{"params":[{"name":"n","type":"int"}],"returnType":"int"}', 1);

-- Insert sample test cases
INSERT INTO test_cases (question_id, input, expected_output, hidden) VALUES
(1, '[2,7,11,15]\n9', '[0,1]', FALSE),
(1, '[3,2,4]\n6', '[1,2]', FALSE),
(1, '[3,3]\n6', '[0,1]', TRUE),
(2, '["h","e","l","l","o"]', '["o","l","l","e","h"]', FALSE),
(2, '["H","a","n","n","a","h"]', '["h","a","n","n","a","H"]', TRUE),
(3, '2', '1', FALSE),
(3, '3', '2', FALSE),
(3, '4', '3', FALSE),
(3, '10', '55', TRUE);

-- Insert sample quizzes
INSERT INTO quizzes (title, description, category, scheduled_time, created_by) VALUES
('JavaScript Basics', 'Test your knowledge of JavaScript fundamentals', 'Programming', NOW(), 1),
('Data Structures', 'Quiz on common data structures and their operations', 'Computer Science', NOW(), 1);

-- Insert sample quiz questions
INSERT INTO quiz_questions (quiz_id, question, options, correct_option, difficulty) VALUES
(1, 'Which of the following is NOT a JavaScript data type?', '{"options": ["String", "Boolean", "Float", "Object"]}', 2, 'Easy'),
(1, 'What will be the output of: console.log(typeof [])?', '{"options": ["array", "object", "undefined", "null"]}', 1, 'Medium'),
(1, 'Which method adds an element to the end of an array?', '{"options": ["push()", "pop()", "shift()", "unshift()"]}', 0, 'Easy'),
(2, 'Which data structure follows the LIFO principle?', '{"options": ["Queue", "Stack", "Linked List", "Tree"]}', 1, 'Easy'),
(2, 'What is the time complexity of binary search?', '{"options": ["O(1)", "O(n)", "O(log n)", "O(n log n)"]}', 2, 'Medium'),
(2, 'Which of the following is NOT a balanced tree?', '{"options": ["AVL Tree", "Red-Black Tree", "Binary Search Tree", "B-Tree"]}', 2, 'Hard');