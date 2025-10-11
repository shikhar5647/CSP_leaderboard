import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { runTournament } from '/lib/tournament-runner';
import { addSubmission } from '/lib/db';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const rollNumber = formData.get('rollNumber');

    if (!file || !rollNumber) {
      return NextResponse.json(
        { error: 'Missing file or roll number' },
        { status: 400 }
      );
    }

    // Validate file extension
    if (!file.name.endsWith('.py')) {
      return NextResponse.json(
        { error: 'Only Python (.py) files are allowed' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save the file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadsDir, `${rollNumber}.py`);
    await writeFile(filePath, buffer);

    // Run the tournament
    const result = await runTournament(filePath, rollNumber);

    // Save to database
    addSubmission({
      rollNumber,
      score: result.score,
      moves: result.moves,
      reassignments: result.reassignments,
      isCorrect: result.is_correct,
      filePath,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Tournament error:', error);
    return NextResponse.json(
      { error: error.message || 'Tournament execution failed' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};