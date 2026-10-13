/**
 * Vercel serverless function for the portfolio chatbot.
 *
 * API KEY SETUP:
 * 1. Local development: create .env.local in the project root and add:
 *      GEMINI_API_KEY=your_gemini_api_key_here
 * 2. Vercel: open Project Settings > Environment Variables and add
 *      Name: GEMINI_API_KEY
 *      Value: your Gemini API key
 *    Then redeploy. Never put the key in index.html, script.js, or any
 *    other browser-side file.
 */

const MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const portfolioContext = `
You are April Jessie Garcia's portfolio assistant. Answer questions about April using only this context unless the user asks a general question.

April is a Bachelor of Science in Information Technology student at Philippine Christian University. Her interests and strengths include UI/UX design, data analysis, frontend development, communication, responsibility, teamwork, versatility, and computer literacy.

Education:
- BS Information Technology, Philippine Christian University (2023-present)
- Accountancy, Business, and Management, Philippine Christian University (2021-2023)

Leadership and experience:
- Sangguniang Kabataan Kagawad (2023-present)
- Junior Philippine Computer Society, Vice President - External (2025-2026)
- Junior Philippine Computer Society, Secretary (2024-2025)

Awards and credentials:
- Dean's Lister (2025-2026)
- Dean's Lister (2023-2024)
- Certificate of Excellence Award
- Certificate of Leadership Award
- Certificate of Recognition for Living in IT Era

Portfolio projects:
- About Me: an HTML and CSS profile section
- My Birth Month Calendar: a calendar layout demonstrating HTML and CSS layout control
- The Multiplication Table: an HTML multiplication chart
- PCU Enrollment: an enrollment form interface using common HTML inputs

Contact:
- Email: april.garcia.coi@pcu.edu.ph
- Phone: +63 956-551-2431
- GitHub: github.com/Lucky-riley
- LinkedIn: April Jessie Garcia

Be friendly, concise, and professional. If asked for information not in the context, say you do not have that detail and suggest contacting April directly. Do not invent job history, grades, links, or personal details.
`;

function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS').setHeader('Access-Control-Allow-Headers', 'Content-Type').send('');
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: 'The chatbot is not configured yet. Add GEMINI_API_KEY in Vercel Environment Variables.' });
    return;
  }

  const incomingMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = incomingMessages
    .filter((message) => message && ['user', 'model'].includes(message.role) && typeof message.text === 'string')
    .slice(-12)
    .map((message) => ({
      role: message.role,
      parts: [{ text: message.text.trim().slice(0, 4000) }],
    }))
    .filter((message) => message.parts[0].text.length > 0);

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    sendJson(res, 400, { error: 'Please send a user message.' });
    return;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: portfolioContext }] },
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API error:', data);
      sendJson(res, response.status, { error: 'Gemini could not answer right now. Please try again.' });
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!reply) {
      sendJson(res, 502, { error: 'Gemini returned an empty response. Please try again.' });
      return;
    }

    sendJson(res, 200, { reply });
  } catch (error) {
    console.error('Chatbot request failed:', error);
    sendJson(res, 500, { error: 'Unable to reach Gemini right now. Please try again later.' });
  }
}
