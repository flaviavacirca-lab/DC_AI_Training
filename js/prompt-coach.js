/* ============================================
   Interactive Prompt Coach — Reusable Module
   Analyzes prompts against the CRAFT framework
   and provides structured feedback.

   Usage:
     DCPromptCoach.init(containerElement)
   The container must include the expected HTML
   structure (see prompt-coach-template).
   ============================================ */

(function () {
    'use strict';

    // --- CRAFT Analysis Engine ---

    var craftChecks = {
        context: {
            label: 'Context',
            patterns: [
                /\b(I'm|I am|we're|we are|our|my)\b.*\b(work|project|client|engagement|company|firm|team|organization)\b/i,
                /\b(situation|background|context|scenario)\b/i,
                /\b(preparing|working on|analyzing|developing|creating)\b.*\b(for|about|on|regarding)\b/i,
                /\b(industry|market|sector|segment)\b/i,
                /\b(client|customer|stakeholder|board|executive)\b/i
            ],
            missing: 'Add context about the situation — who you are, what you\'re working on, and why.'
        },
        role: {
            label: 'Role',
            patterns: [
                /\b(act as|you are|behave as|pretend you're|role of|as a)\b/i,
                /\b(consultant|analyst|expert|advisor|strategist|specialist|researcher)\b/i,
                /\b(perspective|viewpoint|point of view)\b/i
            ],
            missing: 'Assign a role — e.g., "Act as an experienced strategy consultant with expertise in..."'
        },
        action: {
            label: 'Action',
            patterns: [
                /\b(analyze|summarize|draft|write|create|generate|compare|list|outline|evaluate|assess|review|build|design|identify|explain|describe|develop|recommend|suggest|map|calculate|synthesize|brainstorm|propose)\b/i
            ],
            missing: 'Include a clear action verb — what should Copilot DO? (analyze, summarize, draft, compare, etc.)'
        },
        format: {
            label: 'Format',
            patterns: [
                /\b(table|bullet|list|slide|paragraph|summary|memo|email|report|outline|chart|grid|matrix|format|section|column|row|heading|template)\b/i,
                /\b(present as|format as|structure as|organize as|deliver as)\b/i,
                /\b(\d+)\s*(bullet|point|slide|section|paragraph|item|step)/i
            ],
            missing: 'Specify the output format — bullets, table, slide outline, executive summary, etc.'
        },
        tone: {
            label: 'Tone & Constraints',
            patterns: [
                /\b(tone|formal|casual|professional|concise|brief|under \d+|no more than|keep it|word count|audience|exclude|avoid|don't include|constraint|limit|maximum)\b/i,
                /\b(c-suite|executive|board|partner|manager|technical|non-technical)\b.*\b(audience|reader|stakeholder)/i,
                /\b(do not|don't|never|avoid|exclude|skip)\b/i
            ],
            missing: 'Add tone or constraints — audience, word count, what to include/exclude, formality level.'
        }
    };

    function analyzePrompt(prompt) {
        var results = {};
        var score = 0;
        var foundCount = 0;

        Object.keys(craftChecks).forEach(function (key) {
            var check = craftChecks[key];
            var found = check.patterns.some(function (pattern) {
                return pattern.test(prompt);
            });
            results[key] = {
                label: check.label,
                found: found,
                missing: check.missing
            };
            if (found) foundCount++;
        });

        score += foundCount * 16;

        var wordCount = prompt.split(/\s+/).length;
        if (wordCount >= 20) score += 5;
        if (wordCount >= 50) score += 5;
        if (wordCount >= 80) score += 5;

        var lineCount = prompt.split('\n').filter(function (l) { return l.trim().length > 0; }).length;
        if (lineCount >= 3) score += 5;

        score = Math.min(score, 100);

        var suggestions = [];
        Object.keys(results).forEach(function (key) {
            if (!results[key].found) {
                suggestions.push(results[key].missing);
            }
        });

        if (wordCount < 15) {
            suggestions.push('Your prompt is very short. More detail usually yields better results — aim for at least 30-50 words.');
        }
        if (lineCount < 2 && wordCount > 30) {
            suggestions.push('Consider breaking your prompt into multiple lines or sections for clarity.');
        }
        if (!/\b(example|e\.g\.|for instance|such as|like)\b/i.test(prompt) && wordCount > 30) {
            suggestions.push('Including an example of what you want can significantly improve output quality.');
        }

        return { score: score, craftResults: results, suggestions: suggestions };
    }

    function generateImprovedPrompt(original, craftResults) {
        var parts = [];
        if (!craftResults.role.found) {
            parts.push('Act as an experienced strategy consultant.');
        }
        if (!craftResults.context.found) {
            parts.push('I\'m working on a consulting engagement and need your help.');
        }
        parts.push('');
        parts.push(original);
        if (!craftResults.format.found) {
            parts.push('');
            parts.push('Present your response as a structured outline with clear sections and bullet points.');
        }
        if (!craftResults.tone.found) {
            parts.push('');
            parts.push('Keep the tone professional and concise. Audience is a senior business executive.');
        }
        return parts.join('\n');
    }

    function generateStructureSuggestion(craftResults) {
        var lines = ['Suggested CRAFT structure for your prompt:', ''];
        if (!craftResults.role.found) {
            lines.push('Role: "Act as [role] with expertise in [domain]."');
        } else {
            lines.push('Role: (detected in your prompt)');
        }
        if (!craftResults.context.found) {
            lines.push('Context: "I\'m working on [project/task] for [client/audience]."');
        } else {
            lines.push('Context: (detected in your prompt)');
        }
        if (!craftResults.action.found) {
            lines.push('Task: "[Analyze/Summarize/Draft/Compare] [specific subject]."');
        } else {
            lines.push('Task: (detected in your prompt)');
        }
        if (!craftResults.format.found) {
            lines.push('Output: "Format as [table/bullets/outline/email]."');
        } else {
            lines.push('Output: (detected in your prompt)');
        }
        if (!craftResults.tone.found) {
            lines.push('Constraints: "Keep it under [N] words. Audience: [role]. Exclude: [X]."');
        } else {
            lines.push('Constraints: (detected in your prompt)');
        }
        return lines.join('\n');
    }

    function generateBetterQuestions(original, craftResults) {
        var questions = [];
        var hasContext = craftResults.context.found;
        var hasRole = craftResults.role.found;

        if (!hasContext) {
            questions.push('What specific project or client is this for? Adding context helps Copilot tailor the response.');
        }
        if (!hasRole) {
            questions.push('What perspective should Copilot take? (e.g., strategy consultant, market analyst, project manager)');
        }
        if (!craftResults.format.found) {
            questions.push('How will you use the output? Knowing the format (deck, email, brief) helps Copilot structure it right.');
        }
        if (questions.length === 0) {
            questions.push('Your prompt is well-structured. Consider: is there anything you want Copilot to specifically avoid or emphasize?');
        }
        return questions;
    }

    // --- Render into a container ---

    function renderResults(container, score, craftResults, suggestions, originalPrompt) {
        var resultsEl = container.querySelector('.coach-results');
        if (!resultsEl) return;
        resultsEl.hidden = false;

        var scoreCircle = resultsEl.querySelector('.prompt-score');
        if (scoreCircle) {
            scoreCircle.querySelector('.score-value').textContent = score;
            scoreCircle.className = 'score-circle prompt-score';
            if (score >= 75) scoreCircle.classList.add('score-high');
            else if (score >= 45) scoreCircle.classList.add('score-mid');
            else scoreCircle.classList.add('score-low');
        }

        var checklist = resultsEl.querySelector('.craft-checklist');
        if (checklist) {
            checklist.innerHTML = '';
            Object.keys(craftResults).forEach(function (key) {
                var item = craftResults[key];
                var div = document.createElement('div');
                div.className = 'craft-check ' + (item.found ? 'found' : 'missing');
                div.innerHTML = (item.found ? '&#x2713; ' : '&#x2717; ') + item.label;
                checklist.appendChild(div);
            });
        }

        var suggestionsEl = resultsEl.querySelector('.coach-suggestions');
        if (suggestionsEl) {
            suggestionsEl.innerHTML = '';
            if (suggestions.length > 0) {
                var heading = document.createElement('h4');
                heading.textContent = 'Suggestions for Improvement';
                heading.style.color = '#1a2744';
                heading.style.marginBottom = '0.75rem';
                suggestionsEl.appendChild(heading);
                suggestions.forEach(function (s) {
                    var div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = s;
                    suggestionsEl.appendChild(div);
                });
            } else {
                var p = document.createElement('p');
                p.style.color = '#2d8a4e';
                p.style.fontWeight = '600';
                p.textContent = 'Excellent! Your prompt covers all CRAFT dimensions. It should produce strong results in Copilot.';
                suggestionsEl.appendChild(p);
            }
        }

        // Improved prompt
        var improvedSection = resultsEl.querySelector('.improved-prompt');
        var improvedText = resultsEl.querySelector('.improved-prompt-text');
        if (improvedSection && improvedText && score < 75) {
            improvedSection.hidden = false;
            improvedText.textContent = generateImprovedPrompt(originalPrompt, craftResults);
        } else if (improvedSection) {
            improvedSection.hidden = true;
        }

        // Structure suggestion
        var structureSection = resultsEl.querySelector('.structure-suggestion');
        var structureText = resultsEl.querySelector('.structure-suggestion-text');
        if (structureSection && structureText) {
            structureSection.hidden = false;
            structureText.textContent = generateStructureSuggestion(craftResults);
        }

        // Better questions
        var questionsSection = resultsEl.querySelector('.better-questions');
        var questionsList = resultsEl.querySelector('.better-questions-list');
        if (questionsSection && questionsList) {
            var questions = generateBetterQuestions(originalPrompt, craftResults);
            if (questions.length > 0) {
                questionsSection.hidden = false;
                questionsList.innerHTML = '';
                questions.forEach(function (q) {
                    var li = document.createElement('li');
                    li.textContent = q;
                    questionsList.appendChild(li);
                });
            }
        }

        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Initialize a Prompt Coach instance on a container ---

    function init(container) {
        if (!container) return;

        var analyzeBtn = container.querySelector('.coach-analyze-btn');
        var clearBtn = container.querySelector('.coach-clear-btn');
        var copyBtn = container.querySelector('.coach-copy-btn');
        var promptInput = container.querySelector('.coach-textarea');
        var resultsPanel = container.querySelector('.coach-results');

        if (!analyzeBtn || !promptInput) return;

        analyzeBtn.addEventListener('click', function () {
            var prompt = promptInput.value.trim();
            if (!prompt) {
                promptInput.focus();
                return;
            }
            var result = analyzePrompt(prompt);
            renderResults(container, result.score, result.craftResults, result.suggestions, prompt);
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                promptInput.value = '';
                if (resultsPanel) resultsPanel.hidden = true;
                promptInput.focus();
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                var text = promptInput.value.trim();
                if (!text) return;
                navigator.clipboard.writeText(text).then(function () {
                    var original = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(function () {
                        copyBtn.textContent = original;
                    }, 2000);
                });
            });
        }
    }

    // --- Auto-init: find all .prompt-coach-widget containers ---

    function autoInit() {
        document.querySelectorAll('.prompt-coach-widget').forEach(function (el) {
            init(el);
        });
    }

    // --- Expose ---

    window.DCPromptCoach = {
        init: init,
        analyzePrompt: analyzePrompt,
        generateImprovedPrompt: generateImprovedPrompt
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

})();
