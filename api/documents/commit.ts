import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runGraphAgent } from '../../lib/agents';

// POST /api/documents/commit - Commit reviewed entities to graph via Graph Agent
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use: POST' });
  }

  try {
    const { entities } = req.body || {};
    if (!Array.isArray(entities)) {
      return res.status(400).json({ success: false, error: 'Entities array is required' });
    }

    const commitResult = runGraphAgent(entities);
    return res.status(200).json({ success: true, data: commitResult });
  } catch (err: any) {
    console.error('Error in /api/documents/commit:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to commit entities' });
  }
}
