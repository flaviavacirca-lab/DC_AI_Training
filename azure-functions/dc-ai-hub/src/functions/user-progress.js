/**
 * GET /api/user/progress
 *
 * Returns the authenticated user's module completion list from Table Storage.
 */

const { app } = require('@azure/functions');
const { validateToken } = require('../shared/validateToken');
const { getUserCompletions } = require('../shared/tableStorage');

function corsHeaders(origin) {
    const allowed = (process.env.ALLOWED_ORIGIN || 'https://flaviavacirca-lab.github.io').split(',');
    const matched = allowed.find(o => origin === o.trim());
    return {
        'Access-Control-Allow-Origin': matched || allowed[0].trim(),
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };
}

app.http('user-progress', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'user/progress',
    handler: async (request, context) => {
        const origin = request.headers.get('origin') || '';
        const cors = corsHeaders(origin);

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: cors };
        }

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

        try {
            const completions = await getUserCompletions(tokenResult.email);
            return {
                status: 200,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: tokenResult.email, completions: completions })
            };
        } catch (err) {
            context.log('User progress query failed:', err.message);
            return {
                status: 500,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to retrieve progress' })
            };
        }
    }
});
