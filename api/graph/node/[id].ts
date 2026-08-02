import type { VercelRequest, VercelResponse } from '@vercel/node';
import { graphStore } from '../../../lib/graphStore';

// GET /api/graph/node/:id - Node detail with connected edges and risk flags
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use: GET' });
  }

  try {
    const id = (req.query.id as string) || '';
    const detail = graphStore.getNode(id);
    if (!detail.node) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    return res.status(200).json({ success: true, data: detail });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
