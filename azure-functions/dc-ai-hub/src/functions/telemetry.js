/**
 * POST /api/telemetry
 *
 * Records a telemetry event (page_view, module_open, module_complete, prompt_coach_used).
 * Validates Entra token. Does NOT accept raw prompt text.
 *
 * Request body:
 *   { "eventType": "page_view", "data": { "pagePath": "/copilot-101.html" } }
 */

const { app } = require('@azure/functions');
const { validateToken } = require('../shared/validateToken');
const { writeTelemetryEvent, writeCompletion } = require('../shared/tableStorage');

const VALID_EVENTS = ['page_view', 'module_open', 'module_complete', 'prompt_coach_used'];

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

app.http('telemetry', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'telemetry',
    handler: async (request, context) => {
        const origin = request.headers.get('origin') || '';
        const cors = corsHeaders(origin);

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: cors };
        }

        // Validate Entra token
        let tokenResult;
        try {
            const authHeader = request.headers.get('authorization');
            tokenResult = await validateToken(authHeader);
        } catch (err) {
            return {
                status: 401,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        // Parse body
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

        const { eventType, data } = body;

        if (!eventType || !VALID_EVENTS.includes(eventType)) {
            return {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid eventType. Must be one of: ' + VALID_EVENTS.join(', ') })
            };
        }

        // Sanitize: strip any prompt text that might accidentally be sent
        const safeData = {};
        if (data && typeof data === 'object') {
            if (data.pagePath) safeData.pagePath = String(data.pagePath).slice(0, 200);
            if (data.moduleId) safeData.moduleId = String(data.moduleId).slice(0, 100);
            if (data.moduleName) safeData.moduleName = String(data.moduleName).slice(0, 200);
            if (data.phase) safeData.phase = String(data.phase).slice(0, 50);
        }

        try {
            // Write telemetry event
            await writeTelemetryEvent(tokenResult.email, eventType, safeData);

            // For module_complete, also write to completions table
            if (eventType === 'module_complete' && safeData.moduleId) {
                await writeCompletion(tokenResult.email, safeData.moduleId, safeData.moduleName);
            }

            return {
                status: 200,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ok: true })
            };
        } catch (err) {
            context.log('Telemetry write failed:', err.message);
            return {
                status: 500,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to record event' })
            };
        }
    }
});
