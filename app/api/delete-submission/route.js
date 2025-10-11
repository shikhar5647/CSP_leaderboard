import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { runTournament } from '@/lib/tournament-runner';
import { addSubmission } from '@/lib/db';

