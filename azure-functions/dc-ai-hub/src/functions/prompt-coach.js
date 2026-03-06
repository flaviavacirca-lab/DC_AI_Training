/**
 * POST /api/prompt-coach
 *
 * Accepts a user's draft prompt, calls Azure OpenAI to improve it
 * using the CRAFT framework, and returns structured JSON.
 *
 * Request body:
 *   { "prompt": "...", "clarifyingAnswers": [...] }  (answers optional)
 *
 * Response:
 *   { "type": "clarifying_questions", "questions": [...] }
 *   OR
 *   { "type": "final", "improvedPrompt": "...", "whyThisWorks": [...], "followUps": [...] }
 */

const { app } = require('@azure/functions');
const { validateToken } = require('../shared/validateToken');

const SYSTEM_PROMPT = `You are a consulting prompt architect at Denneen & Company, a strategy consulting firm. Your role is to help consultants write highly effective prompts for Microsoft Copilot using the CRAFT framework:

- Context: Background on the situation, project, or client
- Role: What perspective Copilot should take (e.g., strategy consultant, analyst)
- Action: The specific task verb (analyze, summarize, draft, compare, etc.)
- Format: How the output should be structured (bullets, table, memo, slides)
- Tone & Constraints: Audience, length limits, what to include/exclude

INSTRUCTIONS:
1. If the user's draft prompt is too vague to improve meaningfully — for example, it's missing what the task is about, what deliverable is needed, or who the audience is — respond with a "clarifying_questions" JSON object containing 2-4 specific, practical questions.
2. If you have enough context to produce a strong improved prompt, respond with a "final" JSON object.
3. When the user provides clarifying answers alongside their original prompt, always produce a "final" response.
4. The improved prompt should be ready to paste directly into Microsoft Copilot.
5. ALWAYS respond with valid JSON only — no markdown fences, no text outside the JSON object.

When type is "clarifying_questions":
{"type":"clarifying_questions","questions":["Question 1?","Question 2?"]}

When type is "final":
{"type":"final","improvedPrompt":"The complete improved prompt ready to paste into Copilot","whyThisWorks":["Explanation 1","Explanation 2","Explanation 3"],"followUps":["Follow-up prompt 1","Follow-up prompt 2"]}`;

function corsHeaders(origin) {
    const allowed = (process.env.ALLOWED_ORIGIN || 'https://flaviavacirca-lab.github.io').split(',');
    const matched = allowed.find(o => origin === o.trim());
    return {
        'Access-Control-Allow-Origin': matched || allowed[0].trim(),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };
}

app.http('prompt-coach', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'prompt-coach',
    handler: async (request, context) => {
        const origin = request.headers.get('origin') || '';
        const cors = corsHeaders(origin);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: cors };
        }

        // Validate Entra token
        let tokenResult;
        try {
            const authHeader = request.headers.get('authorization');
            tokenResult = await validateToken(authHeader);
        } catch (err) {
            context.log('Auth failed:', err.message);
            return {
                status: 401,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Unauthorized: ' + err.message })
            };
        }

        // Parse request body
        let body;
        try {
            body = await request.json();
        } catch (err) {
            return {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid JSON body' })
            };
        }

        const { prompt, clarifyingAnswers } = body;
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing required field: prompt' })
            };
        }

        // Build messages for Azure OpenAI
        const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

        if (clarifyingAnswers && Array.isArray(clarifyingAnswers) && clarifyingAnswers.length > 0) {
            // Second turn: original prompt + answers
            messages.push({
                role: 'user',
                content: `Original draft prompt:\n${prompt.trim()}\n\nMy answers to your questions:\n${clarifyingAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nPlease produce the final improved prompt.`
            });
        } else {
            // First turn: just the draft
            messages.push({
                role: 'user',
                content: `Please improve this draft prompt for Microsoft Copilot:\n\n${prompt.trim()}`
            });
        }

        // Call Azure OpenAI
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';

        if (!endpoint || !apiKey || !deployment) {
            context.log('Azure OpenAI not configured');
            return {
                status: 503,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'AI service not configured' })
            };
        }

        const openaiUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

        let aiResponse;
        try {
            const res = await fetch(openaiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey
                },
                body: JSON.stringify({
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1500,
                    response_format: { type: 'json_object' }
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                context.log('Azure OpenAI error:', res.status, errText);
                throw new Error(`OpenAI returned ${res.status}`);
            }

            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) throw new Error('Empty response from OpenAI');

            aiResponse = JSON.parse(content);
        } catch (err) {
            context.log('OpenAI call failed:', err.message);
            return {
                status: 502,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'AI service error: ' + err.message })
            };
        }

        // Validate response shape
        if (aiResponse.type !== 'clarifying_questions' && aiResponse.type !== 'final') {
            return {
                status: 502,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Unexpected AI response format' })
            };
        }

        context.log(`Prompt coach used by ${tokenResult.email}, type: ${aiResponse.type}`);

        return {
            status: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
            body: JSON.stringify(aiResponse)
        };
    }
});
