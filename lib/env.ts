export function validateEnv() {
  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    console.error('NEXT_PUBLIC_GEMINI_API_KEY is not set');
    return false;
  }

  // Log for debugging (remove in production)
  console.log('Environment variables loaded:', {
    hasGeminiKey: !!geminiApiKey,
    keyLength: geminiApiKey.length
  });

  return true;
} 