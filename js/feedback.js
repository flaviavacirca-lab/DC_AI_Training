/* ============================================
   Floating Feedback Button + Slide-In Panel
   "Suggest a Use Case or Feedback"
   Stores submissions in localStorage
   ============================================ */

(function () {
    'use strict';

    var STORAGE_KEY = 'dc_ai_hub_feedback';
    var NOTIFY_EMAIL = 'flavia.vacirca@denneen.com';

    // Don't render on login or auth-callback pages
    var page = window.location.pathname;
    if (page.indexOf('index.html') !== -1 && document.body.classList.contains('login-page')) return;
    if (page.indexOf('auth-callback') !== -1) return;

    function createFeedbackUI() {
        // Floating button
        var fab = document.createElement('button');
        fab.className = 'feedback-fab';
        fab.setAttribute('aria-label', 'Suggest a Use Case or Feedback');
        fab.innerHTML = '<span class="feedback-fab-icon">&#x1F4AC;</span><span class="feedback-fab-text">Feedback</span>';
        document.body.appendChild(fab);

        // Overlay
        var overlay = document.createElement('div');
        overlay.className = 'feedback-overlay';
        document.body.appendChild(overlay);

        // Slide-in panel
        var panel = document.createElement('div');
        panel.className = 'feedback-panel';
        panel.innerHTML = buildPanelHTML();
        document.body.appendChild(panel);

        // Toggle
        fab.addEventListener('click', function () {
            panel.classList.toggle('feedback-panel-open');
            overlay.classList.toggle('feedback-overlay-visible');
            fab.classList.toggle('feedback-fab-active');
        });

        overlay.addEventListener('click', closePanel);

        panel.querySelector('.feedback-panel-close').addEventListener('click', closePanel);

        function closePanel() {
            panel.classList.remove('feedback-panel-open');
            overlay.classList.remove('feedback-overlay-visible');
            fab.classList.remove('feedback-fab-active');
        }

        // Tab switching
        panel.querySelectorAll('.feedback-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                var target = this.getAttribute('data-fb-tab');
                panel.querySelectorAll('.feedback-tab').forEach(function (t) { t.classList.remove('feedback-tab-active'); });
                panel.querySelectorAll('.feedback-tab-panel').forEach(function (p) { p.classList.remove('feedback-tab-panel-active'); });
                this.classList.add('feedback-tab-active');
                var targetPanel = panel.querySelector('#fb-panel-' + target);
                if (targetPanel) targetPanel.classList.add('feedback-tab-panel-active');
                // Hide any success messages
                panel.querySelectorAll('.feedback-success').forEach(function (s) { s.hidden = true; });
            });
        });

        // Form submissions
        panel.querySelectorAll('.feedback-form-inner').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var formData = new FormData(this);
                var entries = {};
                formData.forEach(function (v, k) { entries[k] = v; });
                var type = this.getAttribute('data-fb-type');

                // Store in localStorage
                try {
                    var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    var user = window.DCAuth ? DCAuth.getUser() : null;
                    existing.push({
                        type: type,
                        data: entries,
                        submittedBy: user ? user.name : 'Anonymous',
                        email: user ? user.email : '',
                        page: window.location.pathname,
                        timestamp: new Date().toISOString()
                    });
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
                } catch (ex) {}

                // Show success
                var successEl = this.parentNode.querySelector('.feedback-success');
                if (successEl) successEl.hidden = false;
                this.reset();
            });
        });
    }

    function buildPanelHTML() {
        return '' +
            '<div class="feedback-panel-header">' +
                '<h3>Suggest a Use Case or Feedback</h3>' +
                '<button class="feedback-panel-close" aria-label="Close">&times;</button>' +
            '</div>' +
            '<div class="feedback-tabs">' +
                '<button class="feedback-tab feedback-tab-active" data-fb-tab="usecase">Use Case</button>' +
                '<button class="feedback-tab" data-fb-tab="training">Request Training</button>' +
                '<button class="feedback-tab" data-fb-tab="general">General Feedback</button>' +
            '</div>' +
            '<div class="feedback-panel-body">' +
                // Use Case tab
                '<div class="feedback-tab-panel feedback-tab-panel-active" id="fb-panel-usecase">' +
                    '<p class="feedback-panel-desc">Share how you used AI in your work. This helps us build better training.</p>' +
                    '<form class="feedback-form-inner" data-fb-type="use-case">' +
                        '<div class="feedback-field">' +
                            '<label>What did you use Copilot for?</label>' +
                            '<textarea name="usecase" rows="3" required placeholder="e.g., I used the competitive analysis workflow to build a landscape for a client pitch..."></textarea>' +
                        '</div>' +
                        '<div class="feedback-field">' +
                            '<label>What was the result?</label>' +
                            '<textarea name="result" rows="2" placeholder="e.g., Saved 2 hours of research time, client was impressed with the depth..."></textarea>' +
                        '</div>' +
                        '<div class="feedback-field">' +
                            '<label>Related module (optional)</label>' +
                            '<select name="module">' +
                                '<option value="">Select...</option>' +
                                '<option value="competitive-analysis">Competitive Analysis</option>' +
                                '<option value="qw-market-research">Market Research</option>' +
                                '<option value="qw-interview-synthesis">Interview Synthesis</option>' +
                                '<option value="qw-client-emails">Client Emails</option>' +
                                '<option value="qw-deck-drafts">Deck Drafts</option>' +
                                '<option value="qw-market-mapping">Market Mapping</option>' +
                                '<option value="qw-data-summary">Data Summary</option>' +
                                '<option value="copilot-transcripts">Transcripts</option>' +
                                '<option value="other">Other</option>' +
                            '</select>' +
                        '</div>' +
                        '<button type="submit" class="btn btn-primary btn-sm">Submit Use Case</button>' +
                    '</form>' +
                    '<div class="feedback-success" hidden>Thanks for sharing! Your use case has been saved.</div>' +
                '</div>' +
                // Request Training tab
                '<div class="feedback-tab-panel" id="fb-panel-training">' +
                    '<p class="feedback-panel-desc">What topic would you like a training module on?</p>' +
                    '<form class="feedback-form-inner" data-fb-type="training-request">' +
                        '<div class="feedback-field">' +
                            '<label>Topic</label>' +
                            '<input type="text" name="topic" required placeholder="e.g., Using Copilot for financial modeling">' +
                        '</div>' +
                        '<div class="feedback-field">' +
                            '<label>Why is this useful? (optional)</label>' +
                            '<textarea name="details" rows="2" placeholder="What problem would this solve for you?"></textarea>' +
                        '</div>' +
                        '<button type="submit" class="btn btn-primary btn-sm">Submit Request</button>' +
                    '</form>' +
                    '<div class="feedback-success" hidden>Thanks! Your training request has been recorded.</div>' +
                '</div>' +
                // General Feedback tab
                '<div class="feedback-tab-panel" id="fb-panel-general">' +
                    '<p class="feedback-panel-desc">Tell us what&rsquo;s working, what&rsquo;s not, or what we should change.</p>' +
                    '<form class="feedback-form-inner" data-fb-type="general-feedback">' +
                        '<div class="feedback-field">' +
                            '<label>Your feedback</label>' +
                            '<textarea name="feedback" rows="4" required placeholder="What would make this training hub more useful for you?"></textarea>' +
                        '</div>' +
                        '<button type="submit" class="btn btn-primary btn-sm">Send Feedback</button>' +
                    '</form>' +
                    '<div class="feedback-success" hidden>Thanks for the feedback! We&rsquo;ll review it.</div>' +
                '</div>' +
            '</div>';
    }

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFeedbackUI);
    } else {
        createFeedbackUI();
    }
})();
