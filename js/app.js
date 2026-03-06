/* ============================================
   Denneen & Company — AI Learning Hub
   Main Application JavaScript
   ============================================ */

(function () {
    'use strict';

    // --- Mobile Menu Toggle ---
    var menuBtn = document.querySelector('.mobile-menu-btn');
    var navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function () {
            navLinks.classList.toggle('open');
        });
        navLinks.querySelectorAll('.nav-link:not(.nav-dropdown-toggle)').forEach(function (link) {
            link.addEventListener('click', function () {
                navLinks.classList.remove('open');
            });
        });
    }

    // --- Trainings Dropdown (mobile click) ---
    var dropdown = document.querySelector('.nav-dropdown');
    var dropdownToggle = document.querySelector('.nav-dropdown-toggle');
    if (dropdown && dropdownToggle) {
        dropdownToggle.addEventListener('click', function (e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                dropdown.classList.toggle('open');
            }
        });
        dropdown.querySelectorAll('.nav-dropdown-item').forEach(function (item) {
            item.addEventListener('click', function () {
                if (navLinks) navLinks.classList.remove('open');
                dropdown.classList.remove('open');
            });
        });
    }

    // --- Accordion ---
    document.querySelectorAll('.accordion-header').forEach(function (header) {
        header.addEventListener('click', function () {
            var item = this.closest('.accordion-item');
            var wasOpen = item.classList.contains('open');
            var accordion = item.closest('.accordion');
            if (accordion) {
                accordion.querySelectorAll('.accordion-item').forEach(function (i) {
                    i.classList.remove('open');
                });
            }
            if (!wasOpen) item.classList.add('open');
        });
    });

    // --- Form Tabs ---
    document.querySelectorAll('.form-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            var tabName = this.getAttribute('data-tab');
            document.querySelectorAll('.form-tab').forEach(function (t) { t.classList.remove('active'); });
            this.classList.add('active');
            document.querySelectorAll('.form-panel').forEach(function (p) { p.classList.remove('active'); });
            var target = document.getElementById('tab-' + tabName);
            if (target) target.classList.add('active');
            var success = document.getElementById('form-success');
            if (success) success.hidden = true;
        });
    });

    // --- Form Submission ---
    var NOTIFY_EMAIL = 'flavia.vacirca@denneen.com';

    document.querySelectorAll('.feedback-form').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var formData = new FormData(this);
            var formType = this.getAttribute('data-type');
            var entries = {};
            formData.forEach(function (v, k) { entries[k] = v; });

            var subject = 'AI Learning Hub: New ' + formType;
            var bodyParts = ['New submission from the Denneen & Company AI Learning Hub', '', 'Type: ' + formType, 'Submitted: ' + new Date().toLocaleString(), ''];
            Object.keys(entries).forEach(function (key) {
                bodyParts.push(key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1') + ': ' + entries[key]);
            });

            var mailtoLink = 'mailto:' + encodeURIComponent(NOTIFY_EMAIL) +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(bodyParts.join('\n'));

            try {
                var submissions = JSON.parse(localStorage.getItem('dc_ai_hub_submissions') || '[]');
                submissions.push({ type: formType, data: entries, timestamp: new Date().toISOString() });
                localStorage.setItem('dc_ai_hub_submissions', JSON.stringify(submissions));
            } catch (ex) {}

            window.location.href = mailtoLink;
            showFormSuccess();
            this.reset();
        });
    });

    function showFormSuccess() {
        document.querySelectorAll('.form-panel').forEach(function (p) { p.classList.remove('active'); });
        var success = document.getElementById('form-success');
        if (success) success.hidden = false;
    }

    var submitAnother = document.getElementById('submit-another');
    if (submitAnother) {
        submitAnother.addEventListener('click', function () {
            var success = document.getElementById('form-success');
            if (success) success.hidden = true;
            var firstTab = document.querySelector('.form-tab');
            if (firstTab) firstTab.click();
        });
    }

    // --- Smooth Scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var targetId = this.getAttribute('href').substring(1);
            var target = document.getElementById(targetId);
            if (target) {
                e.preventDefault();
                var offset = 80;
                window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - offset, behavior: 'smooth' });
            }
        });
    });

    // --- Prompt Library: Search & Filter ---
    var searchInput = document.getElementById('prompt-search');
    var filterBtns = document.querySelectorAll('.filter-btn');
    var promptCards = document.querySelectorAll('.prompt-card');

    if (searchInput && promptCards.length) {
        searchInput.addEventListener('input', filterPrompts);
    }

    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            filterBtns.forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            filterPrompts();
        });
    });

    function filterPrompts() {
        var search = searchInput ? searchInput.value.toLowerCase() : '';
        var activeFilter = document.querySelector('.filter-btn.active');
        var category = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';

        promptCards.forEach(function (card) {
            var text = card.textContent.toLowerCase();
            var cardCat = card.getAttribute('data-category');
            var matchesSearch = !search || text.indexOf(search) !== -1;
            var matchesFilter = category === 'all' || cardCat === category;
            card.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
        });
    }

    // --- Save Prompt Buttons ---
    document.querySelectorAll('.save-prompt-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var card = this.closest('.prompt-card');
            if (!card) return;
            var title = card.querySelector('.prompt-card-title');
            var category = card.getAttribute('data-category');
            var promptEl = card.querySelector('.prompt-template-text');
            doSavePrompt(btn, title, category, promptEl);
        });
    });

    function doSavePrompt(btn, titleEl, category, promptEl) {
        if (!window.DCProgress) return;
        DCProgress.savePrompt({
            title: titleEl ? titleEl.textContent : 'Untitled',
            category: category || 'General',
            prompt: promptEl ? promptEl.textContent : ''
        });
        btn.textContent = 'Saved!';
        btn.classList.add('saved');
        setTimeout(function () {
            btn.textContent = 'Save';
            btn.classList.remove('saved');
        }, 2000);
    }

    // --- Topic Request Form (Live Trainings) ---
    var topicForm = document.getElementById('topic-request-form');
    if (topicForm) {
        topicForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var topic = document.getElementById('topic-input').value.trim();
            var details = document.getElementById('topic-details').value.trim();
            if (!topic) return;

            try {
                var requests = JSON.parse(localStorage.getItem('dc_ai_hub_topic_requests') || '[]');
                var user = window.DCAuth ? DCAuth.getUser() : null;
                requests.push({
                    topic: topic,
                    details: details,
                    submittedBy: user ? user.name : 'Anonymous',
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('dc_ai_hub_topic_requests', JSON.stringify(requests));
            } catch (ex) {}

            this.reset();
            var msg = document.getElementById('topic-success');
            if (msg) {
                msg.hidden = false;
                setTimeout(function () { msg.hidden = true; }, 3000);
            }
        });
    }

    // --- Account Page ---
    var accountPage = document.getElementById('account-page');
    if (accountPage) {
        renderAccountPage();
    }

    function renderAccountPage() {
        if (!document.getElementById('account-page')) return;
        var user = window.DCAuth ? DCAuth.getUser() : null;

        // Account header
        var header = document.getElementById('account-header');
        if (header) {
            if (user) {
                header.innerHTML =
                    '<div class="account-user">' +
                        '<span class="account-avatar">' + escapeHtml(user.name.charAt(0).toUpperCase()) + '</span>' +
                        '<div><h2>' + escapeHtml(user.name) + '</h2><p>' + escapeHtml(user.email) + '</p></div>' +
                    '</div>' +
                    '<button class="btn btn-outline btn-sm" id="account-signout">Sign Out</button>';
                document.getElementById('account-signout').addEventListener('click', function () {
                    DCAuth.logout();
                });
            }
        }

        if (!user) return;

        // Progress overview
        var progressEl = document.getElementById('account-progress');
        if (progressEl && window.DCProgress) {
            var completed = DCProgress.getCompletedCount();
            var total = DCProgress.MODULES.length;
            var pct = Math.round((completed / total) * 100);
            var recent = DCProgress.getRecentlyCompleted(5);

            var html =
                '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
                '<p class="progress-summary"><strong>' + completed + ' of ' + total + '</strong> completed (' + pct + '%)</p>';

            if (recent.length > 0) {
                html += '<h4>Recently Completed</h4><ul class="recent-list">';
                recent.forEach(function (r) {
                    html += '<li><a href="' + r.page + '">' + escapeHtml(r.title) + '</a><span class="recent-date">' + new Date(r.timestamp).toLocaleDateString() + '</span></li>';
                });
                html += '</ul>';
            }
            progressEl.innerHTML = html;
        }

        // Saved prompts
        var savedEl = document.getElementById('account-saved');
        if (savedEl && window.DCProgress) {
            var prompts = DCProgress.getSavedPrompts();
            if (prompts.length === 0) {
                savedEl.innerHTML = '<p class="empty-state">No saved prompts yet. Browse the <a href="prompt-library.html">Prompt Library</a> to save prompts for quick access.</p>';
            } else {
                var html2 = '<div class="saved-prompts-list">';
                prompts.forEach(function (p) {
                    html2 +=
                        '<div class="saved-prompt-card" data-prompt-id="' + p.id + '">' +
                            '<div class="saved-prompt-header">' +
                                '<div><strong>' + escapeHtml(p.title) + '</strong><span class="saved-prompt-cat">' + escapeHtml(p.category) + '</span></div>' +
                                '<button class="remove-prompt-btn" data-id="' + p.id + '" title="Remove">&times;</button>' +
                            '</div>' +
                            '<div class="saved-prompt-body">' +
                                '<pre class="prompt-code">' + escapeHtml(p.prompt) + '</pre>' +
                            '</div>' +
                        '</div>';
                });
                html2 += '</div>';
                savedEl.innerHTML = html2;

                savedEl.querySelectorAll('.remove-prompt-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        DCProgress.removeSavedPrompt(this.getAttribute('data-id'));
                        renderAccountPage();
                    });
                });

                savedEl.querySelectorAll('.saved-prompt-card').forEach(function (card) {
                    card.addEventListener('click', function (e) {
                        if (e.target.classList.contains('remove-prompt-btn')) return;
                        this.classList.toggle('expanded');
                    });
                });
            }
        }

        // Recommendations
        var recsEl = document.getElementById('account-recommendations');
        if (recsEl && window.DCProgress) {
            var completedCount2 = DCProgress.getCompletedCount();
            var html3 = '';
            if (completedCount2 < 3) {
                html3 =
                    '<p>Looks like you\'re just getting started. Here\'s where we\'d recommend beginning:</p>' +
                    '<ul class="rec-list">' +
                        '<li><a href="copilot-101.html">Copilot 101: The Basics</a> &mdash; Start here if you\'re new to Copilot</li>' +
                        '<li><a href="qw-market-research.html">Quick Win: Accelerate Market Research</a> &mdash; See immediate value</li>' +
                        '<li><a href="qw-client-emails.html">Quick Win: Draft Sharper Client Emails</a> &mdash; A fast, practical win</li>' +
                    '</ul>';
            } else {
                html3 =
                    '<p>Great progress! Here are some next steps to level up:</p>' +
                    '<ul class="rec-list">' +
                        '<li><a href="copilot-for-consulting.html">Copilot for Consulting</a> &mdash; Workflow-specific modules for client work</li>' +
                        '<li><a href="prompt-library.html">Prompt Library</a> &mdash; Ready-to-use prompts for common scenarios</li>' +
                        '<li><a href="copilot-102.html">Copilot 102: Using Agents</a> &mdash; Take your skills further</li>' +
                    '</ul>';
            }
            recsEl.innerHTML = html3;
        }

        // Submissions form
        var subForm = document.getElementById('usecase-form');
        if (subForm) {
            subForm.onsubmit = function (e) {
                e.preventDefault();
                var content = document.getElementById('usecase-content').value.trim();
                var module = document.getElementById('usecase-module').value;
                if (!content) return;
                if (window.DCProgress) DCProgress.addSubmission(content, module);
                this.reset();
                var msg2 = document.getElementById('usecase-success');
                if (msg2) {
                    msg2.hidden = false;
                    setTimeout(function () { msg2.hidden = true; }, 3000);
                }
            };
        }
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Conditional Admin Nav Link ---
    (function checkAdminNav() {
        var API_BASE = '<FUNCTION_APP_URL>';
        // Skip if backend URL is a placeholder or auth not ready
        if (API_BASE.indexOf('<') !== -1) return;
        if (!window.DCAuth || !DCAuth.isAuthenticated() || !DCAuth.getApiAccessToken) return;
        DCAuth.getApiAccessToken().then(function (token) {
            if (!token) return; // Redirect in progress
            return fetch(API_BASE + '/api/admin/check', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
        }).then(function (res) {
            if (!res) return null;
            return res.ok ? res.json() : null;
        }).then(function (data) {
            if (data && data.isAdmin) {
                var navLinksEl = document.querySelector('.nav-links');
                var navAccount = document.getElementById('nav-account');
                if (navLinksEl && navAccount) {
                    var adminLink = document.createElement('a');
                    adminLink.href = 'admin.html';
                    adminLink.className = 'nav-link';
                    adminLink.textContent = 'Admin';
                    navLinksEl.insertBefore(adminLink, navAccount);
                }
            }
        }).catch(function () {
            // Silently ignore — admin check is best-effort
        });
    })();

})();
