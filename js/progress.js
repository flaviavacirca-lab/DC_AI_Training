/* ============================================
   Denneen & Company — AI Learning Hub
   Progress Tracking & Saved Prompts
   Depends on: auth.js (DCAuth)

   Storage keys (per-user):
     dc_ai_training::<upn>::progress
     dc_ai_training::<upn>::saved_prompts
   ============================================ */

(function () {
    'use strict';

    var KEY_PREFIX = 'dc_ai_training::';
    var KEY_PROGRESS = '::progress';
    var KEY_PROMPTS = '::saved_prompts';

    var MODULES = [
        // Original training modules
        { id: 'copilot-101',       title: 'Copilot 101: The Basics',               page: 'copilot-101.html',              category: 'learning-path' },
        { id: 'prompt-engineering', title: 'Prompt Engineering',                     page: 'prompt-training.html',          category: 'learning-path' },
        { id: 'copilot-102',       title: 'Copilot 102: Using Agents',             page: 'copilot-102.html',              category: 'learning-path' },
        { id: 'competitive-analysis', title: 'Competitive Analysis with Copilot Researcher', page: 'competitive-analysis.html', category: 'learning-path' },
        { id: 'email-agent',       title: 'Build an Email Agent',                  page: 'email-agent.html',              category: 'learning-path' },
        { id: 'copilot-transcripts', title: 'Copilot Transcripts in Meetings',    page: 'copilot-transcripts.html',      category: 'learning-path' },
        // Quick wins
        { id: 'qw-market-research',      title: 'Accelerate Market Research',            page: 'qw-market-research.html',       category: 'quick-win' },
        { id: 'qw-interview-synthesis',   title: 'Synthesize Interviews Faster',          page: 'qw-interview-synthesis.html',   category: 'quick-win' },
        { id: 'qw-client-emails',         title: 'Draft Sharper Client Emails',            page: 'qw-client-emails.html',         category: 'quick-win' },
        { id: 'qw-deck-drafts',           title: 'Build Deck First Drafts Faster',        page: 'qw-deck-drafts.html',           category: 'quick-win' },
        { id: 'qw-market-mapping',        title: 'Market Mapping & Hypothesis Brainstorming', page: 'qw-market-mapping.html',    category: 'quick-win' },
        { id: 'qw-data-summary',          title: 'Summarize + Interpret Data',             page: 'qw-data-summary.html',          category: 'quick-win' },
        // Copilot for Consulting modules
        { id: 'cfc-research',      title: 'Research & Market Sizing',              page: 'copilot-for-consulting.html#research',      category: 'consulting' },
        { id: 'cfc-interview',     title: 'Interview & Qualitative Synthesis',     page: 'copilot-for-consulting.html#interview',     category: 'consulting' },
        { id: 'cfc-deck',          title: 'Deck Drafting & Storylining',           page: 'copilot-for-consulting.html#deck',          category: 'consulting' },
        { id: 'cfc-mapping',       title: 'Market Mapping & Hypothesis Dev',       page: 'copilot-for-consulting.html#mapping',       category: 'consulting' },
        { id: 'cfc-data',          title: 'Data Interpretation Support',           page: 'copilot-for-consulting.html#data',          category: 'consulting' },
        { id: 'cfc-ops',           title: 'Internal Ops & Email Efficiency',       page: 'copilot-for-consulting.html#ops',           category: 'consulting' }
    ];

    // --- User Key ---

    function getUserKey() {
        var user = window.DCAuth ? DCAuth.getUser() : null;
        if (!user) return null;
        return (user.upn || user.email || '').toLowerCase();
    }

    // --- Data Layer ---

    function getUserProgress() {
        var key = getUserKey();
        if (!key) return null;
        try {
            return JSON.parse(localStorage.getItem(KEY_PREFIX + key + KEY_PROGRESS)) ||
                   { completed: {}, practiceScores: {}, submissions: [] };
        } catch (e) {
            return { completed: {}, practiceScores: {}, submissions: [] };
        }
    }

    function saveUserProgress(progress) {
        var key = getUserKey();
        if (!key) return;
        try {
            localStorage.setItem(KEY_PREFIX + key + KEY_PROGRESS, JSON.stringify(progress));
        } catch (e) {}
    }

    function getSavedPrompts() {
        var key = getUserKey();
        if (!key) return [];
        try {
            return JSON.parse(localStorage.getItem(KEY_PREFIX + key + KEY_PROMPTS)) || [];
        } catch (e) { return []; }
    }

    function setSavedPrompts(prompts) {
        var key = getUserKey();
        if (!key) return;
        try {
            localStorage.setItem(KEY_PREFIX + key + KEY_PROMPTS, JSON.stringify(prompts));
        } catch (e) {}
    }

    // --- Migration from old storage formats ---

    function migrateOldData() {
        // Migrate from nested format (dc_ai_hub_progress)
        try {
            var oldRaw = localStorage.getItem('dc_ai_hub_progress');
            if (oldRaw) {
                var oldData = JSON.parse(oldRaw);
                Object.keys(oldData).forEach(function (email) {
                    var userData = oldData[email];
                    var userKey = email.toLowerCase();
                    var progressKey = KEY_PREFIX + userKey + KEY_PROGRESS;
                    var promptsKey = KEY_PREFIX + userKey + KEY_PROMPTS;

                    if (!localStorage.getItem(progressKey)) {
                        localStorage.setItem(progressKey, JSON.stringify({
                            completed: userData.completed || {},
                            practiceScores: userData.practiceScores || {},
                            submissions: userData.submissions || []
                        }));
                    }
                    if (!localStorage.getItem(promptsKey) && userData.savedPrompts && userData.savedPrompts.length > 0) {
                        localStorage.setItem(promptsKey, JSON.stringify(userData.savedPrompts));
                    }
                });
                localStorage.removeItem('dc_ai_hub_progress');
            }
        } catch (e) {}

        // Migrate from very old single-user format (dc_ai_hub_user)
        try {
            var veryOld = localStorage.getItem('dc_ai_hub_user');
            if (veryOld) {
                var data = JSON.parse(veryOld);
                if (data && data.email && data.completed) {
                    var uk = data.email.toLowerCase();
                    var pk = KEY_PREFIX + uk + KEY_PROGRESS;
                    if (!localStorage.getItem(pk)) {
                        localStorage.setItem(pk, JSON.stringify({
                            completed: data.completed || {},
                            practiceScores: data.practiceScores || {},
                            submissions: []
                        }));
                    }
                }
                localStorage.removeItem('dc_ai_hub_user');
            }
        } catch (e) {}
    }

    // --- Completion ---

    function markModuleComplete(moduleId) {
        var progress = getUserProgress();
        if (!progress) return;
        if (!progress.completed[moduleId]) {
            progress.completed[moduleId] = new Date().toISOString();
            saveUserProgress(progress);
            // Send telemetry
            var mod = MODULES.find(function (m) { return m.id === moduleId; });
            if (window.DCTelemetry) {
                DCTelemetry.trackModuleComplete(moduleId, mod ? mod.title : '');
            }
        }
    }

    function markModuleIncomplete(moduleId) {
        var progress = getUserProgress();
        if (!progress) return;
        delete progress.completed[moduleId];
        saveUserProgress(progress);
    }

    function isModuleComplete(moduleId) {
        var progress = getUserProgress();
        return progress ? !!progress.completed[moduleId] : false;
    }

    function getCompletedCount() {
        var progress = getUserProgress();
        return progress ? Object.keys(progress.completed).length : 0;
    }

    function getRecentlyCompleted(count) {
        var progress = getUserProgress();
        if (!progress) return [];
        var entries = Object.keys(progress.completed).map(function (id) {
            return { id: id, timestamp: progress.completed[id] };
        });
        entries.sort(function (a, b) { return b.timestamp.localeCompare(a.timestamp); });
        return entries.slice(0, count || 5).map(function (entry) {
            var mod = MODULES.find(function (m) { return m.id === entry.id; });
            return { id: entry.id, title: mod ? mod.title : entry.id, page: mod ? mod.page : '#', timestamp: entry.timestamp };
        });
    }

    // --- Practice Scores ---

    function savePracticeScore(moduleId, score, total) {
        var progress = getUserProgress();
        if (!progress) return;
        progress.practiceScores[moduleId] = { score: score, total: total, timestamp: new Date().toISOString() };
        saveUserProgress(progress);
    }

    // --- Saved Prompts ---

    function savePrompt(promptData) {
        var prompts = getSavedPrompts();
        var id = 'sp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        prompts.push({
            id: id,
            title: promptData.title || 'Untitled Prompt',
            category: promptData.category || 'General',
            prompt: promptData.prompt,
            notes: promptData.notes || '',
            savedAt: new Date().toISOString()
        });
        setSavedPrompts(prompts);
        return id;
    }

    function removeSavedPrompt(promptId) {
        var prompts = getSavedPrompts();
        prompts = prompts.filter(function (p) { return p.id !== promptId; });
        setSavedPrompts(prompts);
    }

    // --- Submissions ---

    function addSubmission(content, moduleRelated) {
        var progress = getUserProgress();
        if (!progress) return;
        progress.submissions.push({
            content: content,
            module: moduleRelated || '',
            timestamp: new Date().toISOString()
        });
        saveUserProgress(progress);
    }

    // --- UI: Completion Toggles ---

    function renderCompletionToggles() {
        var toggles = document.querySelectorAll('[data-module-complete]');
        var user = window.DCAuth ? DCAuth.getUser() : null;

        toggles.forEach(function (el) {
            var moduleId = el.getAttribute('data-module-complete');
            if (!user) {
                el.innerHTML = '';
                return;
            }

            var isComplete = isModuleComplete(moduleId);
            el.innerHTML =
                '<button class="completion-toggle ' + (isComplete ? 'completed' : '') + '" title="' + (isComplete ? 'Completed! Click to undo' : 'Mark as complete') + '">' +
                    '<span class="completion-icon">' + (isComplete ? '&#x2713;' : '&#x25CB;') + '</span>' +
                    '<span>' + (isComplete ? 'Completed' : 'Mark Complete') + '</span>' +
                '</button>';

            el.querySelector('.completion-toggle').addEventListener('click', function () {
                if (isComplete) {
                    markModuleIncomplete(moduleId);
                } else {
                    markModuleComplete(moduleId);
                }
                updateAllProgressUI();
            });
        });
    }

    // --- UI: Progress Overview ---

    function renderProgressCards() {
        var container = document.getElementById('progress-cards');
        if (!container) return;

        var user = window.DCAuth ? DCAuth.getUser() : null;
        if (!user) {
            container.innerHTML = '';
            return;
        }

        var completedCount = getCompletedCount();
        var total = MODULES.length;
        var percent = Math.round((completedCount / total) * 100);

        var html =
            '<div class="progress-overview">' +
                '<div class="progress-bar-container">' +
                    '<div class="progress-bar-fill" style="width:' + percent + '%"></div>' +
                '</div>' +
                '<p class="progress-summary">' + completedCount + ' of ' + total + ' completed (' + percent + '%)</p>' +
            '</div>' +
            '<div class="progress-module-list">';

        MODULES.forEach(function (mod) {
            var done = isModuleComplete(mod.id);
            html +=
                '<a href="' + mod.page + '" class="progress-module-item ' + (done ? 'progress-done' : '') + '">' +
                    '<span class="progress-check">' + (done ? '&#x2713;' : '&#x25CB;') + '</span>' +
                    '<span class="progress-module-title">' + mod.title + '</span>' +
                '</a>';
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // --- UI: Auth Banner ---

    function renderAuthBanner() {
        var container = document.getElementById('auth-banner');
        if (!container) return;

        var user = window.DCAuth ? DCAuth.getUser() : null;
        if (!user) {
            container.innerHTML = '';
            return;
        }

        var completedCount = getCompletedCount();
        container.innerHTML =
            '<div class="auth-banner auth-banner-signed-in">' +
                '<div class="auth-user-info">' +
                    '<span class="auth-avatar">' + escapeHtml(user.name.charAt(0).toUpperCase()) + '</span>' +
                    '<div class="auth-user-details">' +
                        '<strong>' + escapeHtml(user.name) + '</strong>' +
                        '<span class="auth-progress-text">' + completedCount + ' of ' + MODULES.length + ' completed</span>' +
                    '</div>' +
                '</div>' +
                '<div class="auth-actions">' +
                    '<a href="account.html" class="btn btn-primary btn-sm">My Dashboard</a>' +
                    '<button class="btn btn-outline btn-sm" id="banner-signout-btn">Sign Out</button>' +
                '</div>' +
            '</div>';

        var signOutBtn = document.getElementById('banner-signout-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', function () {
                if (window.DCAuth) DCAuth.logout();
            });
        }
    }

    // --- UI: Learning Path Progress ---

    function renderPathProgress() {
        var steps = document.querySelectorAll('[data-path-module]');
        if (!steps.length) return;
        steps.forEach(function (el) {
            var moduleId = el.getAttribute('data-path-module');
            if (isModuleComplete(moduleId)) {
                el.classList.add('path-step-complete');
            } else {
                el.classList.remove('path-step-complete');
            }
        });
    }

    // --- Master Update ---

    function updateAllProgressUI() {
        renderAuthBanner();
        renderCompletionToggles();
        renderProgressCards();
        renderPathProgress();
        updateNavAccount();
    }

    // --- Nav Account Link ---

    function updateNavAccount() {
        var navAccount = document.getElementById('nav-account');
        if (!navAccount) return;
        navAccount.textContent = 'Account';
        navAccount.href = 'account.html';
    }

    // --- Utilities ---

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Expose ---

    window.DCProgress = {
        MODULES: MODULES,
        markModuleComplete: markModuleComplete,
        markModuleIncomplete: markModuleIncomplete,
        isModuleComplete: isModuleComplete,
        getCompletedCount: getCompletedCount,
        getRecentlyCompleted: getRecentlyCompleted,
        savePracticeScore: savePracticeScore,
        savePrompt: savePrompt,
        removeSavedPrompt: removeSavedPrompt,
        getSavedPrompts: getSavedPrompts,
        addSubmission: addSubmission,
        getUserProgress: getUserProgress,
        updateAllProgressUI: updateAllProgressUI,
        renderCompletionToggles: renderCompletionToggles,
        renderAuthBanner: renderAuthBanner
    };

    // --- Init ---

    migrateOldData();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateAllProgressUI);
    } else {
        updateAllProgressUI();
    }

})();
