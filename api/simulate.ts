import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runSimulationAgent } from '../lib/agents';

// POST /api/simulate - Run Policy Change Impact Simulation
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use: POST' });
  }

  try {
    const { proposedChange } = req.body || {};
    if (!proposedChange || typeof proposedChange !== 'string') {
      return res.status(400).json({ success: false, error: 'proposedChange string is required' });
    }

    const result = await runSimulationAgent(proposedChange);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error in /api/simulate:', err);
    return res.status(500).json({ success: false, error: err.message || 'Simulation failed' });
  }
}
