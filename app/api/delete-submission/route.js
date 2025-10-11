import { deleteSubmission } from '/lib/db';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

export async function DELETE(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return Response.json({ error: 'Missing submission ID' }, { status: 400 });
    }

    const submission = deleteSubmission(id);

    // Delete the file if it exists
    if (submission && submission.filePath && existsSync(submission.filePath)) {
      try {
        await unlink(submission.filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}