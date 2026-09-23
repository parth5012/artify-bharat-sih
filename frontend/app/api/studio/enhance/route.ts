import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Missing image payload' }, { status: 400 });
    }

    // Resolve studio python worker path
    const studioDir = path.resolve(process.cwd(), 'backend', 'studio');
    const pythonExe = process.platform === 'win32'
      ? path.join(studioDir, '.venv', 'Scripts', 'python.exe')
      : path.join(studioDir, '.venv', 'bin', 'python');
    const scriptPath = path.join(studioDir, 'process.py');

    if (!fs.existsSync(pythonExe)) {
      console.warn('Studio Python venv not found at:', pythonExe);
      return NextResponse.json({ error: 'Studio Python service not initialized' }, { status: 503 });
    }

    // Use temp files to avoid pipe buffer limits on large camera photos
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tmpIn = path.join(os.tmpdir(), `artify-in-${uniqueId}.json`);
    const tmpOut = path.join(os.tmpdir(), `artify-out-${uniqueId}.json`);

    try {
      await fs.promises.writeFile(tmpIn, JSON.stringify({ image }), 'utf-8');

      // Execute Python OpenCV + rembg (U²-Net) worker
      await execFileAsync(pythonExe, [scriptPath, tmpIn, tmpOut], {
        cwd: studioDir,
        timeout: 45000,
        maxBuffer: 20 * 1024 * 1024,
      });

      if (!fs.existsSync(tmpOut)) {
        throw new Error('Python worker did not generate output file');
      }

      const outContent = await fs.promises.readFile(tmpOut, 'utf-8');
      const result = JSON.parse(outContent);

      return NextResponse.json(result);
    } finally {
      // Clean up temp files
      try {
        if (fs.existsSync(tmpIn)) await fs.promises.unlink(tmpIn);
        if (fs.existsSync(tmpOut)) await fs.promises.unlink(tmpOut);
      } catch {}
    }
  } catch (error: any) {
    console.error('AI Studio API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process studio image' },
      { status: 500 }
    );
  }
}
