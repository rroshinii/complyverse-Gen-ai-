import { GoogleGenAI } from '@google/genai';

/**
 * Shared, lazily-initialized Gemini client.
 *
 * Serverless functions are re-instantiated per cold start, so this module-level
 * singleton only saves repeat work within a warm instance - but that's still
 * worthwhile, and it keeps every agent from re-implementing client setup.
 *
 * The API key is read exclusively from the environment (GEMINI_API_KEY) and is
 * never sent to the client or logged.
 */
let aiClient: GoogleGenAI | null = null;

export function hasGeminiApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Using fallback heuristic agent execution.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'dummy-key-for-fallback',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}
