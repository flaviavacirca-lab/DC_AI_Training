/* ============================================
   Denneen & Company — AI Learning Hub
   Progress Tracking & Saved Prompts
   Depends on: auth.js (DCAuth)
   ============================================ */

(function () {
    'use strict';

    var PROGRESS_KEY = 'dc_ai_hub_progress';

    var MODULES = [
        // Original training modules
        { id: 'copilot-101',       title: 'Copilot 101: The Basics',               page: 'copilot-101.html',              category: 'learning-path' },
        { id: 'prompt-engineering', title: 'Prompt Engineering',                     page: 'prompt-training.html',          category: 'learning-path' },
        { id: 'copilot-102',       title: 'Copilot 102: Using Agents',             page: 'copilot-102.html',              category: 'learning-path' },
        { id: 'market-research',   title: 'Market Research with AI',               page: 'market-research.html',          category: 'learning-path' },
        { id: 'email-agent',       title: 'Build an Email Agent',                  page: 'email-agent.html',              category: 'learning-path' },
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

    // --- Data Layer ---

    function getAllProgress() {
        try {
            return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
        } catch (e) { return {}; }
    }

    function saveAllProgress(data) {
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function getUserProgress() {
        var user = window.DCAuth ? DCAuth.getUser() : null;
        if (!user) return null;
        var all = getAllProgress();
        var key = user.email.toLowerCase();
        if (!all[key]) {
            all[key] = { completed: {}, savedPrompts: [], practiceScores: {}, submissions: [] };
            saveAllProgress(all);
        }
        return all[key];
    }

    function saveUserProgress(progress) {
        var user = window.DCAuth ? DCAuth.getUser() : null;
        if (!user) return;
        var all = getAllProgress();
        all[user.email.toLowerCase()] = progress;
        saveAllProgress(all);
    }

    // --- Migrate old data ---

    function migrateOldData() {
        try {
            var old = JSON.parse(localStorage.getItem('dc_ai_hub_user'));
            if (old && old.email && old.completed) {
                var all = getAllProgress();
                var key = old.email.toLowerCase();
                if (!all[key]) {
                    all[key] = {
                        completed: old.completed || {},
                        savedPrompts: [],
                        practiceScores: old.practiceScores || {},
                        submissions: []
                    };
                    saveAllProgress(all);
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
        var progress = getUserProgress();
        if (!progress) return;
        var id = 'sp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        progress.savedPrompts.push({
            id: id,
            title: promptData.title || 'Untitled Prompt',
            category: promptData.category || 'General',
            prompt: promptData.prompt,
            notes: promptData.notes || '',
            savedAt: new Date().toISOString()
        });
        saveUserProgress(progress);
        return id;
    }

    function removeSavedPrompt(promptId) {
        var progress = getUserProgress();
        if (!progress) return;
        progress.savedPrompts = progress.savedPrompts.filter(function (p) { return p.id !== promptId; });
        saveUserProgress(progress);
    }

    function getSavedPrompts() {
        var progress = getUserProgress();
        return progress ? progress.savedPrompts : [];
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
                el.innerHTML =
                    '<button class="completion-toggle completion-signin" title="Sign in to track progress">' +
                        '<span class="completion-icon">&#x25CB;</span>' +
                        '<span>Sign in to track</span>' +
                    '</button>';
                el.querySelector('.completion-signin').addEventListener('click', function () {
                    if (window.DCAuth) DCAuth.showSignInModal(function () { updateAllProgressUI(); });
                });
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
            container.innerHTML =
                '<div class="progress-signin-prompt">' +
                    '<p><strong>Sign in to see your progress across all modules.</strong></p>' +
                    '<button class="btn btn-primary btn-sm" id="progress-signin-btn">Sign In</button>' +
                '</div>';
            var btn = document.getElementById('progress-signin-btn');
            if (btn) btn.addEventListener('click', function () {
                if (window.DCAuth) DCAuth.showSignInModal(function () { updateAllProgressUI(); });
            });
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
        if (user) {
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
                    if (window.DCAuth) DCAuth.signOut();
                    updateAllProgressUI();
                });
            }
        } else {
            container.innerHTML =
                '<div class="auth-banner auth-banner-signed-out">' +
                    '<div class="auth-prompt">' +
                        '<strong>Track your learning progress</strong>' +
                        '<span>Sign in to mark modules complete, save prompts, and track your journey.</span>' +
                    '</div>' +
                    '<button class="btn btn-primary btn-sm" id="banner-signin-btn">Sign In</button>' +
                '</div>';

            var signInBtn = document.getElementById('banner-signin-btn');
            if (signInBtn) {
                signInBtn.addEventListener('click', function () {
                    if (window.DCAuth) DCAuth.showSignInModal(function () { updateAllProgressUI(); });
                });
            }
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
        var user = window.DCAuth ? DCAuth.getUser() : null;
        if (user) {
            navAccount.textContent = 'Account';
            navAccount.href = 'account.html';
        } else {
            navAccount.textContent = 'Sign In';
            navAccount.href = '#';
            navAccount.onclick = function (e) {
                e.preventDefault();
                if (window.DCAuth) DCAuth.showSignInModal(function () { updateAllProgressUI(); });
            };
        }
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

    if (window.DCAuth) {
        DCAuth.onAuthChange(function () {
            updateAllProgressUI();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateAllProgressUI);
    } else {
        updateAllProgressUI();
    }

})();
