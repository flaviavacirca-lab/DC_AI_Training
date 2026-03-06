/* ============================================
   Module Navigation
   Prev / Next / Mark Complete + lateral links
   Depends on: progress.js (DCProgress)
   ============================================ */

(function () {
    'use strict';

    // Ordered module flow matching the Suggested Training Flow
    var FLOW = [
        { id: 'copilot-101',          page: 'copilot-101.html',          title: 'Copilot 101: The Basics',                  phase: 'Foundation' },
        { id: 'prompt-engineering',    page: 'prompt-training.html',      title: 'Prompt Engineering',                       phase: 'Foundation' },
        { id: 'qw-market-research',   page: 'qw-market-research.html',   title: 'Quick Win: Market Research',               phase: 'Quick Wins' },
        { id: 'qw-client-emails',     page: 'qw-client-emails.html',     title: 'Quick Win: Client Emails',                 phase: 'Quick Wins' },
        { id: 'qw-interview-synthesis', page: 'qw-interview-synthesis.html', title: 'Quick Win: Interview Synthesis',        phase: 'Quick Wins' },
        { id: 'qw-deck-drafts',       page: 'qw-deck-drafts.html',       title: 'Quick Win: Deck Drafts',                   phase: 'Quick Wins' },
        { id: 'qw-market-mapping',    page: 'qw-market-mapping.html',    title: 'Quick Win: Market Mapping',                phase: 'Quick Wins' },
        { id: 'qw-data-summary',      page: 'qw-data-summary.html',      title: 'Quick Win: Data Summary',                  phase: 'Quick Wins' },
        { id: 'copilot-transcripts',  page: 'copilot-transcripts.html',  title: 'Copilot Transcripts in Meetings',          phase: 'Core' },
        { id: 'copilot-102',          page: 'copilot-102.html',          title: 'Copilot 102: Using Agents',                phase: 'Advanced' },
        { id: 'email-agent',          page: 'email-agent.html',          title: 'Build an Email Agent',                     phase: 'Advanced' },
        { id: 'competitive-analysis', page: 'competitive-analysis.html', title: 'Competitive Analysis with Copilot Researcher', phase: 'Advanced' }
    ];

    // Related modules for lateral nav
    var RELATED = {
        'copilot-101':           ['prompt-engineering', 'qw-market-research'],
        'prompt-engineering':    ['copilot-101', 'copilot-102'],
        'qw-market-research':   ['qw-market-mapping', 'competitive-analysis'],
        'qw-client-emails':     ['qw-deck-drafts', 'qw-interview-synthesis'],
        'qw-interview-synthesis': ['qw-client-emails', 'copilot-transcripts'],
        'qw-deck-drafts':       ['qw-client-emails', 'qw-data-summary'],
        'qw-market-mapping':    ['qw-market-research', 'competitive-analysis'],
        'qw-data-summary':      ['qw-deck-drafts', 'qw-market-mapping'],
        'copilot-transcripts':  ['qw-interview-synthesis', 'copilot-102'],
        'copilot-102':          ['copilot-101', 'competitive-analysis'],
        'email-agent':          ['copilot-102', 'competitive-analysis'],
        'competitive-analysis': ['qw-market-research', 'copilot-102']
    };

    function getCurrentPage() {
        var path = window.location.pathname;
        var filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return filename;
    }

    function findCurrentIndex() {
        var page = getCurrentPage();
        for (var i = 0; i < FLOW.length; i++) {
            if (FLOW[i].page === page) return i;
        }
        return -1;
    }

    function findFlowItem(id) {
        for (var i = 0; i < FLOW.length; i++) {
            if (FLOW[i].id === id) return FLOW[i];
        }
        return null;
    }

    function render() {
        var idx = findCurrentIndex();
        if (idx === -1) return; // Not a module page

        var current = FLOW[idx];
        var prev = idx > 0 ? FLOW[idx - 1] : null;
        var next = idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
        var related = RELATED[current.id] || [];

        var container = document.createElement('section');
        container.className = 'section module-nav-section';
        container.innerHTML = buildHTML(current, prev, next, related);

        // Insert before the footer
        var footer = document.querySelector('footer');
        if (footer) {
            footer.parentNode.insertBefore(container, footer);
        }

        // Bind mark-complete button
        var markBtn = container.querySelector('.module-nav-complete-btn');
        if (markBtn) {
            updateCompleteBtn(markBtn, current.id);
            markBtn.addEventListener('click', function () {
                if (!window.DCProgress) return;
                if (DCProgress.isModuleComplete(current.id)) {
                    DCProgress.markModuleIncomplete(current.id);
                } else {
                    DCProgress.markModuleComplete(current.id);
                }
                updateCompleteBtn(markBtn, current.id);
                if (DCProgress.updateAllProgressUI) DCProgress.updateAllProgressUI();
            });
        }
    }

    function updateCompleteBtn(btn, moduleId) {
        if (!window.DCProgress) {
            btn.style.display = 'none';
            return;
        }
        var done = DCProgress.isModuleComplete(moduleId);
        btn.className = 'btn module-nav-complete-btn ' + (done ? 'module-nav-completed' : 'module-nav-incomplete');
        btn.innerHTML = done
            ? '<span class="module-nav-check">&#x2713;</span> Completed — Click to Undo'
            : '<span class="module-nav-check">&#x25CB;</span> Mark as Complete';
    }

    function buildHTML(current, prev, next, relatedIds) {
        var html = '<div class="module-nav-wrapper">';

        // Mark complete
        html += '<div class="module-nav-complete">';
        html += '<button class="btn module-nav-complete-btn module-nav-incomplete">';
        html += '<span class="module-nav-check">&#x25CB;</span> Mark as Complete';
        html += '</button>';
        html += '</div>';

        // Prev / Next
        html += '<div class="module-nav-arrows">';
        if (prev) {
            html += '<a href="' + prev.page + '" class="module-nav-btn module-nav-prev">';
            html += '<span class="module-nav-dir">&larr; Previous</span>';
            html += '<span class="module-nav-title">' + prev.title + '</span>';
            html += '</a>';
        } else {
            html += '<div></div>';
        }
        if (next) {
            html += '<a href="' + next.page + '" class="module-nav-btn module-nav-next">';
            html += '<span class="module-nav-dir">Next &rarr;</span>';
            html += '<span class="module-nav-title">' + next.title + '</span>';
            html += '</a>';
        } else {
            html += '<a href="suggested-training-flow.html" class="module-nav-btn module-nav-next">';
            html += '<span class="module-nav-dir">Done! &rarr;</span>';
            html += '<span class="module-nav-title">Back to Training Flow</span>';
            html += '</a>';
        }
        html += '</div>';

        // Related / lateral links
        if (relatedIds.length > 0) {
            html += '<div class="module-nav-related">';
            html += '<span class="module-nav-related-label">Related modules:</span>';
            relatedIds.forEach(function (id) {
                var item = findFlowItem(id);
                if (item) {
                    html += '<a href="' + item.page + '" class="module-nav-related-link">' + item.title + '</a>';
                }
            });
            html += '</div>';
        }

        // Training flow link
        html += '<div class="module-nav-flow-link">';
        html += '<a href="suggested-training-flow.html">&larr; Back to Training Flow</a>';
        html += ' &nbsp;&middot;&nbsp; ';
        html += '<a href="training-library.html">Training Library &rarr;</a>';
        html += '</div>';

        html += '</div>';
        return html;
    }

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
