import { auth } from './firebase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function processIssue(issueId: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`${BACKEND_URL}/api/ai/process-issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ issue_id: issueId }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn('processIssue failed', res.status, txt);
    }
  } catch (e) {
    console.warn('processIssue error', e);
  }
}
