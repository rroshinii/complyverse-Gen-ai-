import type { VercelRequest, VercelResponse } from '@vercel/node';
import { graphStore } from '../../lib/graphStore';

// GET /api/graph/export - Full graph JSON for 3D visualization
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use: GET' });
  }

  try {
    const data = graphStore.getExport();
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
