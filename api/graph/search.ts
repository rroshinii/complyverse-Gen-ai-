import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runEvidenceAgent } from '../../lib/agents';

// GET /api/graph/search - Evidence Agent Natural Language Search & Q&A
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use: GET' });
  }

  try {
    const query = (req.query.q as string) || '';
    if (!query.trim()) {
      return res.status(400).json({ success: false, error: 'Search query parameter q is required' });
    }

    const qaAnswer = await runEvidenceAgent(query);
    return res.status(200).json({ success: true, data: qaAnswer });
  } catch (err: any) {
    console.error('Error in /api/graph/search:', err);
    return res.status(500).json({ success: false, error: err.message || 'Evidence search failed' });
  }
}
