/**
 * A website that ask users one (Yes/No, A or B) question at a time from a bank of questions. Their 
 * answer is recorded in a database. 
 *
 * After the user answers a question, the system find the next question that would evenly splits the 
 * people who have answer it before. Each question afterwards should evenly split the population by 
 * 50% until the users answers are unique to themselves. 
 * 
 * Similar to 20 questions. 
 * 
 * The goal of this website is to find a series of questions that are needed to uniquely identify 
 * everyone on the planet in the fewest questions possible. 
 * 
 * Features:
 * - All answers are either A or B.
 * - All questions have 2 options, with diffeerent text for each option.
 * - Questions are submitted by users.
 * - Questions are approved by an admin before being used.
 * - Questions are stored in a SQLite database.
 * - Session IDs are generated using UUIDs and saved to the user desktop as a cookie.
 * - Questions are served to the user one at a time.
 *
 * 
 * Routes:
 * - GET  /                       - Serves the main HTML page. Human interface
 * - GET  /api/questions/next     - Gets the next question for a session
 *                                  Payload: { sessionId }
 * - GET  /api/data               - Gets a JSON object with all the questions and answers for this session
 *                                  Payload: { sessionId }
 * - GET  /api/info               - Gets a JSON object with all the session stats. 
 *                                  Payload: { sessionId }
 *                                  - How many questions have they answered.
 * - POST /api/session            - Creates a new session
 * - POST /api/answer             - Records an answer to a question for a session
 *                                  Payload: { questionId, answer, sessionId }
 * - POST /api/questions/submit   - Submits a new question
 *                                  Payload: { text, optionA, optionB, sessionId }
 * - POST /api/questions/flag    - Reports a question for moderation
 *                                  Payload: { questionId, sessionId }
 * - GET  /api/questions/stats    - Gets statistics for a specific question
 *                                  Payload: { questionId }
 * - GET  /api/session/stats      - Gets statistics for a specific session
 *                                  Payload: { sessionId }
 
 */
import express, { Request, Response } from 'express';
import path from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// --- Initialization ---
const app = express();
app.use(express.json());

// Serve static front-end files from /public
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// SQLite DB
const db = new Database('data.sqlite');

// Bootstrap schema
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),    
    text TEXT NOT NULL,
    optionA TEXT NOT NULL,
    optionB TEXT NOT NULL,
    ratio REAL DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS answers (
    session_id TEXT NOT NULL REFERENCES sessions(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    answer_value TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, question_id)
  );
  CREATE TABLE IF NOT EXISTS skipped_questions (
    session_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, question_id)
  );
  CREATE TABLE IF NOT EXISTS moderation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Prepared statements

const insertSession = db.prepare('INSERT INTO sessions (id) VALUES (?)');
const insertQuestion = db.prepare('INSERT INTO questions (session_id, text, optionA, optionB) VALUES (?, ?, ?, ?)');
const insertAnswer = db.prepare('INSERT INTO answers (session_id, question_id, answer_value) VALUES (?, ?, ?)');

// --- Functions ---

// Function to update the ratio for a question
function updateQuestionRatio(questionId: number) {
  // Count answers for A and B
  const countA = (db.prepare('SELECT COUNT(*) as count FROM answers WHERE question_id = ? AND answer_value = ?').get(questionId, 'A') as any).count;
  const countB = (db.prepare('SELECT COUNT(*) as count FROM answers WHERE question_id = ? AND answer_value = ?').get(questionId, 'B') as any).count;
  const total = countA + countB;
  let ratio: number | null = null;
  if (total > 0) {
    // Ratio is the smaller count divided by the total (so 0.5 is perfectly even)
    ratio = Math.min(countA, countB) / total;
  } else {
    // No answers yet, set ratio to 50% so we can use this question
    ratio = 0.5;
  }
  db.prepare('UPDATE questions SET ratio = ? WHERE id = ?').run(ratio, questionId);

  console.log(`Updated question ${questionId} ratio to ${ratio}`);
}


// Debug
// Go though all the questions and update the ratio
// db.prepare('SELECT id FROM questions').all().forEach((row: any) => {
//   const questionId = row.id;
//   updateQuestionRatio(questionId);
// });



// --- Routes ---

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/api/session', (req: Request, res: Response) => {
  const sessionId = uuidv4();
  insertSession.run(sessionId);
  res.json({ sessionId });
});

app.post('/api/questions/submit', (req: Request, res: Response) => {
  const { text, optionA, optionB, sessionId } = req.body;
  if(!text || !optionA || !optionB || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if(text.length <= 0 || optionA.length <= 0 || optionB.length <= 0) {
    return res.status(400).json({ error: 'Text, Option A and Option B must be non-empty strings' });
  } 
  if (optionA === optionB) {
    return res.status(400).json({ error: 'Option A and Option B cannot be the same' });
  }
  const sessionExists = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?').get(sessionId) as any;
  if (sessionExists.count === 0) {
    return res.status(400).json({ error: 'Session ID does not exist' });
  }
  const questionExists = db.prepare('SELECT COUNT(*) as count FROM questions WHERE text = ? AND session_id = ?').get(text, sessionId) as any;
  if (questionExists.count > 0) {
    return res.status(400).json({ error: 'Question already exists' });
  }
  insertQuestion.run(sessionId, text, optionA, optionB);
  res.json({ success: true });
});

app.post('/api/answer', (req: Request, res: Response) => {
  const { questionId, answer, sessionId } = req.body;
  if(!questionId || !answer || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if(answer !== 'A' && answer !== 'B') {
    return res.status(400).json({ error: 'Answer must be either A or B' });
  }
  const sessionExists = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?').get(sessionId) as any;
  if (sessionExists.count === 0) {
    return res.status(400).json({ error: 'Session ID does not exist' });
  }
  const questionExists = db.prepare('SELECT COUNT(*) as count FROM questions WHERE id = ?').get(questionId) as any;
  if (questionExists.count === 0) {
    return res.status(400).json({ error: 'Question ID does not exist' });
  }
  insertAnswer.run(sessionId, questionId, answer);
  updateQuestionRatio(questionId);
  res.json({ success: true });
});

app.post('/api/questions/flag', (req: Request, res: Response) => {
  const { questionId, sessionId } = req.body;
  if (!questionId || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const questionExists = db.prepare('SELECT COUNT(*) as count FROM questions WHERE id = ?').get(questionId) as any;
  if (questionExists.count === 0) {
    return res.status(400).json({ error: 'Question ID does not exist' });
  }
  db.prepare('INSERT INTO moderation (question_id, session_id) VALUES (?, ?)').run(questionId, sessionId);
  res.json({ success: true });
});

// Endpoint to skip a question
app.post('/api/questions/skip', (req: Request, res: Response) => {
  const { questionId, sessionId } = req.body;
  if (!questionId || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Insert into skipped_questions
  db.prepare('INSERT OR IGNORE INTO skipped_questions (session_id, question_id) VALUES (?, ?)').run(sessionId, questionId);
  res.json({ success: true });
});

app.get('/api/data', (req: Request, res: Response) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  // Check if sessionId exists
  const sessionExists = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?').get(sessionId);
  if ((sessionExists as any).count === 0) {
    return res.status(400).json({ error: 'Session ID does not exist' });
  }

  // Get all questions and answers for this session
  const questions = db.prepare('SELECT * FROM questions WHERE session_id = ?').all(sessionId);
  const answers = db.prepare('SELECT * FROM answers WHERE session_id = ?').all(sessionId);

  res.json({ questions, answers });
});

app.get('/api/info', (req: Request, res: Response) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  const sessionExists = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?').get(sessionId) as any;
  if (sessionExists.count === 0) {
    return res.status(400).json({ error: 'Session ID does not exist' });
  }
  const answeredQuestions = db.prepare('SELECT COUNT(*) as count FROM answers WHERE session_id = ?').get(sessionId) as any;
  const questionCount = answeredQuestions.count;
  res.json({ questionCount });
});


app.get('/api/questions/next', (req: Request, res: Response) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  const sessionExists = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?').get(sessionId) as any;
  if (sessionExists.count === 0) {
    return res.status(400).json({ error: 'Session ID does not exist' });
  }

  // 1. Try to find any unanswered/unskipped questions (regardless of ratio)
  let questions = db.prepare(`
    SELECT * FROM questions 
    WHERE id NOT IN (SELECT question_id FROM answers WHERE session_id = ?)
      AND id NOT IN (SELECT question_id FROM skipped_questions WHERE session_id = ?)
    ORDER BY created_at ASC, RANDOM()
  `).all(sessionId, sessionId) as any[];

  // 2. If there are any with a ratio, sort by closest to 0.5
  if (questions.length > 0 && questions.some(q => q.ratio !== null)) {
    questions = questions.sort((a, b) => {
      // If both have ratio, sort by abs(ratio-0.5)
      if (a.ratio !== null && b.ratio !== null) {
        return Math.abs(a.ratio - 0.5) - Math.abs(b.ratio - 0.5);
      }
      // Prefer questions with a ratio
      if (a.ratio !== null) return -1;
      if (b.ratio !== null) return 1;
      return 0;
    });
  }

  if (questions.length === 0) {
    return res.status(404).json({ error: 'No more questions available' });
  }
  const nextQuestion = questions[0];
  res.json({
    questionId: nextQuestion.id,
    text: nextQuestion.text,
    optionA: nextQuestion.optionA,
    optionB: nextQuestion.optionB,
  });
});

app.get('/api/questions/stats', (req: Request, res: Response) => {
  const { questionId } = req.query;
  if (!questionId) {
    return res.status(400).json({ error: 'Missing questionId' });
  }
  // Get question text and options
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId) as any;
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }
  // Get answer counts
  const total = (db.prepare('SELECT COUNT(*) as count FROM answers WHERE question_id = ?').get(questionId) as any).count;
  const countA = (db.prepare('SELECT COUNT(*) as count FROM answers WHERE question_id = ? AND answer_value = ?').get(questionId, 'A') as any).count;
  const countB = (db.prepare('SELECT COUNT(*) as count FROM answers WHERE question_id = ? AND answer_value = ?').get(questionId, 'B') as any).count;
  const percentA = total > 0 ? Math.round((countA / total) * 100) : 0;
  const percentB = total > 0 ? Math.round((countB / total) * 100) : 0;
  res.json({
    questionId: question.id,
    text: question.text,
    optionA: question.optionA,
    optionB: question.optionB,
    percentA,
    percentB,
    total
  });
});

app.get('/api/session/stats', (req: Request, res: Response) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  // Check if session exists
  const sessionExists = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE id = ?').get(sessionId) as any;
  if (sessionExists.count === 0) {
    return res.status(404).json({ error: 'Session not found' });
  }
  // Get question count
  const questionCount = (db.prepare('SELECT COUNT(*) as count FROM answers WHERE session_id = ?').get(sessionId) as any).count;
  // Get last 10 answers
  const recentAnswers = db.prepare('SELECT question_id as questionId, answer_value FROM answers WHERE session_id = ? ORDER BY created_at DESC LIMIT 10').all(sessionId) as any[];
  res.json({
    sessionId,
    questionCount,
    recentAnswers
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});
app.use((err: Error, req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));