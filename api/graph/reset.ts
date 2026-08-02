import type { VercelRequest, VercelResponse } from '@vercel/node';
import { graphStore } from '../../lib/graphStore';

// DELETE /api/graph/reset - Reset graph to default seed
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use: DELETE' });
  }

  try {
    graphStore.seed();
    const updated = graphStore.getExport();
    return res.status(200).json({
      success: true,
      message: 'Graph re-seeded to default enterprise state',
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
