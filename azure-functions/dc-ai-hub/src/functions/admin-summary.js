/**
 * GET /api/admin/summary
 *
 * Returns aggregated analytics for admin users only.
 * Restricted via ADMIN_EMAILS environment variable.
 *
 * Response:
 * {
 *   activeUsers7d, activeUsers30d,
 *   pageViews: { pagePath: count },
 *   moduleCompletions: { moduleId: count },
 *   promptCoachUses: number,
 *   userCompletions: { email: [{ moduleId, moduleName, completedAt }] }
 * }
 */

const { app } = require('@azure/functions');
const { validateToken } = require('../shared/validateToken');
const { getAllCompletions, getTelemetryEvents } = require('../shared/tableStorage');

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

app.http('admin-summary', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'admin/summary',
    handler: async (request, context) => {
        const origin = request.headers.get('origin') || '';
        const cors = corsHeaders(origin);

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: cors };
        }

        // Validate token
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

        // Enforce admin-only
        if (!isAdmin(tokenResult.email)) {
            return {
                status: 403,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Admin access required' })
            };
        }

        try {
            // Fetch data in parallel
            const [events30d, completions] = await Promise.all([
                getTelemetryEvents(30),
                getAllCompletions()
            ]);

            const now = new Date();
            const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Active users
            const users7d = new Set();
            const users30d = new Set();
            const pageViews = {};
            let promptCoachUses = 0;

            events30d.forEach(evt => {
                users30d.add(evt.userEmail);
                if (new Date(evt.timestamp) >= cutoff7d) {
                    users7d.add(evt.userEmail);
                }
                if (evt.eventType === 'page_view' && evt.eventData.pagePath) {
                    const path = evt.eventData.pagePath;
                    pageViews[path] = (pageViews[path] || 0) + 1;
                }
                if (evt.eventType === 'prompt_coach_used') {
                    promptCoachUses++;
                }
            });

            // Module completion counts + per-user map
            const moduleCompletions = {};
            const userCompletions = {};

            completions.forEach(c => {
                moduleCompletions[c.moduleId] = (moduleCompletions[c.moduleId] || 0) + 1;
                if (!userCompletions[c.userEmail]) {
                    userCompletions[c.userEmail] = [];
                }
                userCompletions[c.userEmail].push({
                    moduleId: c.moduleId,
                    moduleName: c.moduleName,
                    completedAt: c.completedAt
                });
            });

            return {
                status: 200,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activeUsers7d: users7d.size,
                    activeUsers30d: users30d.size,
                    pageViews: pageViews,
                    moduleCompletions: moduleCompletions,
                    promptCoachUses: promptCoachUses,
                    userCompletions: userCompletions
                })
            };
        } catch (err) {
            context.log('Admin summary failed:', err.message);
            return {
                status: 500,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to generate summary' })
            };
        }
    }
});
