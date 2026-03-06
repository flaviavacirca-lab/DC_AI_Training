/**
 * GET /api/admin/check
 *
 * Returns { "isAdmin": true/false } for the authenticated user.
 * Checks against the ADMIN_EMAILS environment variable.
 */

const { app } = require('@azure/functions');
const { validateToken } = require('../shared/validateToken');

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

function isAdmin(email) {
    const adminList = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    return adminList.includes(email.toLowerCase());
}

app.http('admin-check', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'admin/check',
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

        return {
            status: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAdmin: isAdmin(tokenResult.email) })
        };
    }
});
