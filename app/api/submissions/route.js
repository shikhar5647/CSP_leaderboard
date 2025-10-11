import { getSubmissions } from '/lib/db';

export async function GET() {
  try {
    const submissions = getSubmissions();
    return Response.json({ submissions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}