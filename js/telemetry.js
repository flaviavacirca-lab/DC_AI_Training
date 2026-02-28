/* ============================================
   Denneen & Company — AI Learning Hub
   Telemetry — Lightweight event tracking

   Sends events to POST /api/telemetry.
   NEVER sends raw prompt text.

   Depends on: auth.js (DCAuth.acquireToken)
   ============================================ */

(function () {
    'use strict';

    // -------------------------------------------------------
    // Configuration — update after deploying the Azure Function
    // -------------------------------------------------------
    var API_URL = '<FUNCTION_APP_URL>/api/telemetry';
    var API_SCOPE = 'api://<API_CLIENT_ID>/access_as_user';

    // Debounce duplicate page_view events
    var lastPageView = '';

    function send(eventType, data) {
        if (!window.DCAuth || !DCAuth.acquireToken || !DCAuth.isAuthenticated()) return;

        DCAuth.acquireToken([API_SCOPE]).then(function (response) {
            var body = { eventType: eventType, data: data || {} };
            fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + response.accessToken
                },
                body: JSON.stringify(body)
            }).catch(function () {
                // Silently ignore — telemetry is best-effort
            });
        }).catch(function () {
            // Token acquisition failed — skip telemetry
        });
    }

    // --- Public event methods ---

    function trackPageView() {
        var pagePath = window.location.pathname.split('/').pop() || 'index.html';
        if (pagePath === lastPageView) return;
        lastPageView = pagePath;
        send('page_view', { pagePath: pagePath });
    }

    function trackModuleOpen(moduleId, moduleName) {
        send('module_open', { moduleId: moduleId, moduleName: moduleName || '' });
    }

    function trackModuleComplete(moduleId, moduleName) {
        send('module_complete', { moduleId: moduleId, moduleName: moduleName || '' });
    }

    function trackPromptCoachUsed(phase) {
        send('prompt_coach_used', { phase: phase || 'analyze' });
    }

    // --- Auto-track page view on load ---

    function autoTrack() {
        var pageName = window.location.pathname.split('/').pop() || 'index.html';
        // Don't track login or callback pages
        if (pageName === 'index.html' || pageName === 'auth-callback.html') return;
        trackPageView();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoTrack);
    } else {
        autoTrack();
    }

    // --- Expose ---

    window.DCTelemetry = {
        trackPageView: trackPageView,
        trackModuleOpen: trackModuleOpen,
        trackModuleComplete: trackModuleComplete,
        trackPromptCoachUsed: trackPromptCoachUsed
    };

})();
