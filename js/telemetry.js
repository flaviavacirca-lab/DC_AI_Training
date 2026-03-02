/* ============================================
   Denneen & Company — AI Learning Hub
   Telemetry — Lightweight event tracking

   Sends events to POST /api/telemetry.
   NEVER sends raw prompt text.
   Gracefully no-ops when backend is not deployed.

   Depends on: auth.js (DCAuth.getApiAccessToken)
   ============================================ */

(function () {
    'use strict';

    // -------------------------------------------------------
    // Configuration — update after deploying the Azure Function
    // -------------------------------------------------------
    var API_URL = '<FUNCTION_APP_URL>/api/telemetry';

    // Check if backend is configured (not still a placeholder)
    function isBackendConfigured() {
        return API_URL.indexOf('<') === -1 && API_URL.indexOf('>') === -1;
    }

    // Debounce duplicate page_view events
    var lastPageView = '';

    function send(eventType, data) {
        // Skip entirely if backend URL is a placeholder
        if (!isBackendConfigured()) return;
        if (!window.DCAuth || !DCAuth.getApiAccessToken || !DCAuth.isAuthenticated()) return;

        DCAuth.getApiAccessToken().then(function (token) {
            if (!token) return; // Redirect in progress or no token
            var body = { eventType: eventType, data: data || {} };
            fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
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
