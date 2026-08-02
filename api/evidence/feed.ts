import type { VercelRequest, VercelResponse } from '@vercel/node';
import { graphStore } from '../../lib/graphStore';

// GET /api/evidence/feed - Risk flags feed
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use: GET' });
  }

  try {
    const riskFeed = graphStore.getRiskFeed();
    return res.status(200).json({ success: true, data: riskFeed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
