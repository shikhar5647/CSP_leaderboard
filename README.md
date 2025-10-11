# CSP Tournament Leaderboard

A competitive platform for the Graph Coloring CSP assignment.

## Features

- 🎯 Submit Python agent files
- 🏆 Real-time leaderboard
- 🔄 Automatic tournament execution
- 📊 Detailed scoring metrics
- 🗑️ Unsubmit functionality

## Local Development

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/shikhar5647/CSP_leaderboard
cd csp-tournament
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
```bash
npm run init-db
```

4. Create the Python directory and add game files:
```bash
mkdir python
# Copy game_engine.py, level1.json to python/
```

5. Create uploads directory:
```bash
mkdir uploads
```

6. Run development server:
```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
csp-tournament/
├── app/
│   ├── api/              # API routes
│   ├── page.js           # Main page
│   ├── layout.js         # Root layout
│   └── globals.css       # Global styles
├── lib/
│   ├── db.js             # Database operations
│   └── tournament-runner.js  # Tournament execution
├── python/
│   ├── game_engine.py    # CSP game engine
│   └── level1.json       # Level configuration
├── uploads/              # Student submissions
└── tournament.db         # SQLite database
```

## Deployment

### Vercel (Frontend Only)

For full Python support, use a separate backend.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Recommended: Split Architecture

1. **Frontend (Vercel)**: Next.js UI
2. **Backend (Railway/Render)**: Python tournament execution

See deployment guide in docs for details.

## Environment Variables

```
DATABASE_PATH=./tournament.db
UPLOAD_DIR=./uploads
PYTHON_PATH=python3
```

## API Endpoints

- `GET /api/submissions` - Get all submissions
- `POST /api/run-tournament` - Submit and run agent
- `DELETE /api/delete-submission` - Remove submission

## Security Notes

- Validate all file uploads
- Sanitize file names
- Implement rate limiting
- Add authentication for production
- Sandbox Python execution

## License

MIT