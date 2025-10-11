import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'tournament.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rollNumber TEXT NOT NULL,
    score REAL NOT NULL,
    moves INTEGER NOT NULL,
    reassignments INTEGER NOT NULL,
    isCorrect INTEGER NOT NULL,
    filePath TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export function addSubmission({ rollNumber, score, moves, reassignments, isCorrect, filePath }) {
  const stmt = db.prepare(`
    INSERT INTO submissions (rollNumber, score, moves, reassignments, isCorrect, filePath)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(rollNumber, score, moves, reassignments, isCorrect ? 1 : 0, filePath);
}

export function getSubmissions() {
  const stmt = db.prepare(`
    SELECT id, rollNumber, score, moves, reassignments, 
           isCorrect, timestamp
    FROM submissions
    ORDER BY score DESC, reassignments ASC, moves ASC
  `);
  
  return stmt.all();
}

export function deleteSubmission(id) {
  const getStmt = db.prepare('SELECT * FROM submissions WHERE id = ?');
  const submission = getStmt.get(id);
  
  if (submission) {
    const deleteStmt = db.prepare('DELETE FROM submissions WHERE id = ?');
    deleteStmt.run(id);
  }
  
  return submission;
}
