/* ============================================
   Denneen & Company — AI Learning Hub
   Prompt Coach Agent
   Calls the Azure Function backend for AI-powered
   prompt improvement. Acquires Entra token via MSAL.

   Depends on: auth.js (DCAuth.getApiAccessToken)
   ============================================ */

(function () {
    'use strict';

    // -------------------------------------------------------
    // Configuration — replace after deploying the Azure Function
    // -------------------------------------------------------
    var API_URL = '<FUNCTION_APP_URL>/api/prompt-coach';

    // Check if backend is configured (not still a placeholder)
    function isBackendConfigured() {
        return API_URL.indexOf('<') === -1 && API_URL.indexOf('>') === -1;
    }

    // --- Acquire bearer token ---

    function getAccessToken() {
        if (!window.DCAuth || !DCAuth.getApiAccessToken) {
            return Promise.reject(new Error('Auth not available'));
        }
        return DCAuth.getApiAccessToken().then(function (token) {
            if (!token) {
                throw new Error('Finishing sign-in\u2026 please try again after the page reloads.');
            }
            return token;
        });
    }

    // --- Call the prompt-coach API ---

    function callAPI(prompt, clarifyingAnswers) {
        return getAccessToken().then(function (token) {
            var body = { prompt: prompt };
            if (clarifyingAnswers && clarifyingAnswers.length > 0) {
                body.clarifyingAnswers = clarifyingAnswers;
            }
            return fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(body)
            });
        }).then(function (res) {
            if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    throw new Error(data.error || 'Request failed (' + res.status + ')');
                });
            }
            return res.json();
        });
    }

    // --- Initialize agent UI on a container ---

    function initAgent(container) {
        if (!container) return;

        var analyzeBtn = container.querySelector('.coach-analyze-btn');
        var promptInput = container.querySelector('.coach-textarea');
        if (!analyzeBtn || !promptInput) return;

        // Create "AI Improve" button next to the existing analyze button
        var actionsDiv = container.querySelector('.coach-actions');
        if (!actionsDiv) return;

        var aiBtn = document.createElement('button');
        aiBtn.type = 'button';
        aiBtn.className = 'btn btn-accent coach-ai-btn';
        aiBtn.textContent = 'AI Improve';

        // If backend is not configured, disable the button with a tooltip
        if (!isBackendConfigured()) {
            aiBtn.disabled = true;
            aiBtn.title = 'AI backend not configured yet. See README for setup.';
            aiBtn.style.opacity = '0.5';
        }

        actionsDiv.insertBefore(aiBtn, analyzeBtn.nextSibling);

        // Create agent results panel
        var agentPanel = document.createElement('div');
        agentPanel.className = 'agent-panel';
        agentPanel.hidden = true;
        agentPanel.innerHTML =
            '<div class="agent-loading" hidden>' +
                '<div class="agent-spinner"></div>' +
                '<p>Analyzing your prompt with AI\u2026</p>' +
            '</div>' +
            '<div class="agent-error" hidden></div>' +
            '<div class="agent-clarify" hidden>' +
                '<h4>A few questions to sharpen your prompt</h4>' +
                '<div class="agent-clarify-questions"></div>' +
                '<button type="button" class="btn btn-primary btn-sm agent-clarify-submit">Submit Answers</button>' +
            '</div>' +
            '<div class="agent-final" hidden>' +
                '<h4>AI-Improved Prompt</h4>' +
                '<pre class="prompt-code agent-improved-text"></pre>' +
                '<button type="button" class="btn btn-outline btn-sm agent-copy-btn">Copy to Clipboard</button>' +
                '<div class="agent-reasons" hidden>' +
                    '<h4>Why This Works</h4>' +
                    '<ul class="agent-reasons-list"></ul>' +
                '</div>' +
                '<div class="agent-followups" hidden>' +
                    '<h4>Suggested Follow-Ups</h4>' +
                    '<ul class="agent-followups-list"></ul>' +
                '</div>' +
            '</div>';

        // Insert after the coach-results panel (or after coach-input if no results)
        var resultsPanel = container.querySelector('.coach-results');
        var insertAfter = resultsPanel || container.querySelector('.coach-input');
        if (insertAfter && insertAfter.parentNode) {
            insertAfter.parentNode.insertBefore(agentPanel, insertAfter.nextSibling);
        } else {
            container.appendChild(agentPanel);
        }

        // State
        var currentPrompt = '';
        var isBusy = false;

        // --- Show/hide helpers ---

        function showLoading() {
            agentPanel.hidden = false;
            agentPanel.querySelector('.agent-loading').hidden = false;
            agentPanel.querySelector('.agent-error').hidden = true;
            agentPanel.querySelector('.agent-clarify').hidden = true;
            agentPanel.querySelector('.agent-final').hidden = true;
            aiBtn.disabled = true;
            aiBtn.textContent = 'Improving\u2026';
        }

        function hideLoading() {
            agentPanel.querySelector('.agent-loading').hidden = true;
            aiBtn.disabled = false;
            aiBtn.textContent = 'AI Improve';
            isBusy = false;
        }

        function showError(msg) {
            hideLoading();
            var errorEl = agentPanel.querySelector('.agent-error');
            errorEl.textContent = msg;
            errorEl.hidden = false;
        }

        function showClarifyingQuestions(questions) {
            hideLoading();
            var clarifyDiv = agentPanel.querySelector('.agent-clarify');
            var questionsDiv = agentPanel.querySelector('.agent-clarify-questions');
            questionsDiv.innerHTML = '';
            questions.forEach(function (q, i) {
                var group = document.createElement('div');
                group.className = 'form-group';
                group.innerHTML =
                    '<label>' + escapeHtml(q) + '</label>' +
                    '<input type="text" class="agent-answer-input" data-index="' + i + '" placeholder="Your answer\u2026">';
                questionsDiv.appendChild(group);
            });
            clarifyDiv.hidden = false;
            // Focus first input
            var firstInput = questionsDiv.querySelector('input');
            if (firstInput) firstInput.focus();
        }

        function showFinalResult(data) {
            hideLoading();
            var finalDiv = agentPanel.querySelector('.agent-final');

            // Improved prompt
            agentPanel.querySelector('.agent-improved-text').textContent = data.improvedPrompt || '';

            // Also put it in the textarea for easy editing
            promptInput.value = data.improvedPrompt || '';

            // Why this works
            var reasonsDiv = agentPanel.querySelector('.agent-reasons');
            var reasonsList = agentPanel.querySelector('.agent-reasons-list');
            if (data.whyThisWorks && data.whyThisWorks.length > 0) {
                reasonsList.innerHTML = '';
                data.whyThisWorks.forEach(function (r) {
                    var li = document.createElement('li');
                    li.textContent = r;
                    reasonsList.appendChild(li);
                });
                reasonsDiv.hidden = false;
            } else {
                reasonsDiv.hidden = true;
            }

            // Follow-ups
            var followupsDiv = agentPanel.querySelector('.agent-followups');
            var followupsList = agentPanel.querySelector('.agent-followups-list');
            if (data.followUps && data.followUps.length > 0) {
                followupsList.innerHTML = '';
                data.followUps.forEach(function (f) {
                    var li = document.createElement('li');
                    li.textContent = f;
                    followupsList.appendChild(li);
                });
                followupsDiv.hidden = false;
            } else {
                followupsDiv.hidden = true;
            }

            finalDiv.hidden = false;
            agentPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // --- Event handlers ---

        aiBtn.addEventListener('click', function () {
            if (isBusy || !isBackendConfigured()) return;
            currentPrompt = promptInput.value.trim();
            if (!currentPrompt) {
                promptInput.focus();
                return;
            }
            isBusy = true;
            showLoading();
            if (window.DCTelemetry) DCTelemetry.trackPromptCoachUsed('analyze');
            callAPI(currentPrompt).then(function (data) {
                if (data.type === 'clarifying_questions') {
                    showClarifyingQuestions(data.questions);
                } else if (data.type === 'final') {
                    showFinalResult(data);
                } else {
                    showError('Unexpected response from AI service.');
                }
            }).catch(function (err) {
                showError(err.message || 'Failed to reach AI service.');
            });
        });

        // Submit clarifying answers
        agentPanel.querySelector('.agent-clarify-submit').addEventListener('click', function () {
            if (isBusy) return;
            var inputs = agentPanel.querySelectorAll('.agent-answer-input');
            var answers = [];
            inputs.forEach(function (input) {
                answers.push(input.value.trim() || '(no answer)');
            });
            isBusy = true;
            agentPanel.querySelector('.agent-clarify').hidden = true;
            showLoading();
            if (window.DCTelemetry) DCTelemetry.trackPromptCoachUsed('clarify');
            callAPI(currentPrompt, answers).then(function (data) {
                if (data.type === 'final') {
                    showFinalResult(data);
                } else if (data.type === 'clarifying_questions') {
                    showClarifyingQuestions(data.questions);
                } else {
                    showError('Unexpected response from AI service.');
                }
            }).catch(function (err) {
                showError(err.message || 'Failed to reach AI service.');
            });
        });

        // Copy improved prompt
        agentPanel.querySelector('.agent-copy-btn').addEventListener('click', function () {
            var text = agentPanel.querySelector('.agent-improved-text').textContent;
            if (!text) return;
            var btn = this;
            navigator.clipboard.writeText(text).then(function () {
                btn.textContent = 'Copied!';
                setTimeout(function () { btn.textContent = 'Copy to Clipboard'; }, 2000);
            });
        });
    }

    // --- Utility ---

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Auto-init on all prompt coach widgets ---

    function autoInit() {
        document.querySelectorAll('.prompt-coach-widget').forEach(function (el) {
            initAgent(el);
        });
    }

    // --- Expose ---

    window.DCPromptCoachAgent = {
        initAgent: initAgent,
        callAPI: callAPI
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

})();
