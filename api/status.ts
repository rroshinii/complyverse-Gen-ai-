import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hasGeminiApiKey } from '../lib/gemini';

// GET /api/status - Reports whether agents are running on live Gemini calls
// or the deterministic fallback (no API key set). Surfaced in the UI so
// judges/users know exactly which mode they're seeing instead of it being silent.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use: GET' });
  }

  const hasApiKey = hasGeminiApiKey();
  return res.status(200).json({
    success: true,
    data: {
      mode: hasApiKey ? 'live' : 'fallback',
      model: hasApiKey ? 'gemini-3.6-flash' : null
    }
  });
}
