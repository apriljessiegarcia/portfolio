/**
 * Vercel serverless function for the portfolio chatbot.
 *
 * Vercel Environment Variables:
 *   GEMINI_API_KEY=your_gemini_api_key
 *   GEMINI_MODEL=gemini-3.8-flash   (optional)
 *
 * Never put the real API key in index.html, script.js, style.css, or GitHub.
 */

const DEFAULT_MODEL = 'gemini-3.8-flash';

const portfolioContext = `
You are April Jessie Garcia's portfolio assistant. Be friendly, concise, and professional.
Only use the following portfolio information when answering questions about April:

- April is pursuing a Bachelor of Science in Information Technology at Philippine Christian University.
- Skills and interests: UI/UX design, data analysis, frontend development, communication, responsibility, teamwork, versatility, and computer literacy.
- Education: BS Information Technology at Philippine Christian University (2023-present); Accountancy, Business, and Management at Philippine Christian University (2021-2023).
- Experience: Sangguniang Kabataan Kagawad (2023-present); Junior Philippine Computer Society Vice President - External (2025-2026); Junior Philippine Computer Society Secretary (2024-2025).
- Awards: Dean's Lister (2025-2026 and 2023-2024), Certificate of Excellence Award, Certificate of Leadership Award, and Certificate of Recognition for Living in IT Era.
- Projects: About Me profile section, My Birth Month Calendar, The Multiplication Table, and PCU Enrollment interface.
- Contact: april.garcia.coi@pcu.edu.ph, +63 956-551-2431, GitHub github.com/Lucky-riley.

If information is not listed here, say that you do not have that detail and suggest contacting April directly. Do not invent facts.
`;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    json(res, 500, { error: 'Chatbot is not configured. Add GEMINI_API_KEY in Vercel Environment Variables.' });
    return;
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = incoming
    .filter((message) => message && ['user', 'model'].includes(message.role) && typeof message.text === 'string')
    .slice(-12)
    .map((message) => ({
      role: message.role,
      parts: [{ text: message.text.trim().slice(0, 4000) }],
    }))
    .filter((message) => message.parts[0].text.length > 0);

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    json(res, 400, { error: 'Please send a question.' });
    return;
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: portfolioContext }] },
        contents: messages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = data.error?.message || `Gemini returned HTTP ${response.status}.`;
      console.error('Gemini API error:', { status: response.status, model, message: providerMessage });
      json(res, 502, { error: `Gemini rejected the request: ${providerMessage}` });
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!reply) {
      const finishReason = data.candidates?.[0]?.finishReason;
      json(res, 502, { error: finishReason ? `Gemini returned no text (${finishReason}).` : 'Gemini returned an empty response.' });
      return;
    }

    json(res, 200, { reply });
  } catch (error) {
    console.error('Chatbot request failed:', error);
    json(res, 500, { error: 'Unable to reach Gemini right now. Please try again later.' });
  }
}
