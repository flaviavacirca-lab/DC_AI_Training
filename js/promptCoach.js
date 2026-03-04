/* ============================================
   Denneen & Company — AI Learning Hub
   Prompt Coach — Client-Side Guided Builder

   Two modes:
     A) "Build a Prompt"  — guided, adaptive questions
     B) "Improve a Draft" — paste + heuristic feedback

   100 % front-end. No API calls. No login popups.

   Extensibility:
     - Add goals to GOALS
     - Add questions to QUESTION_BANK
     - Add keyword detectors to KEYWORD_MAP
   ============================================ */

(function () {
    'use strict';

    // ==========================================================
    //  QUESTION BANK
    //  Each question has: id, text, hint, type, options (if select),
    //  and tags used by the selection logic.
    // ==========================================================

    var QUESTION_BANK = [
        // --- Always-ask questions ---
        {
            id: 'audience',
            text: 'Who is this for?',
            hint: 'The person who will read/use the output.',
            type: 'select',
            options: [
                'Client executive (VP+)',
                'Client project team',
                'Internal consulting team',
                'Partner / Board',
                'Mixed / multiple audiences'
            ],
            tags: ['always']
        },
        {
            id: 'outputFormat',
            text: 'What output do you need?',
            hint: 'How Copilot should structure the response.',
            type: 'select',
            options: [
                'Slide bullets / outline',
                'Table / matrix',
                'Memo / written document',
                'Email draft',
                'Bullet list / summary',
                'Structured analysis'
            ],
            tags: ['always']
        },
        {
            id: 'inputs',
            text: 'What context will you give Copilot?',
            hint: 'Select everything you\'ll paste or reference.',
            type: 'select',
            options: [
                'Interview transcripts / notes',
                'Existing document / report',
                'Data / numbers / spreadsheet',
                'URLs / web links',
                'Brief description only (no attachments)',
                'Nothing yet \u2014 need Copilot to start from scratch'
            ],
            tags: ['always']
        },
        // --- Goal-specific questions ---
        {
            id: 'industry',
            text: 'What industry or market?',
            hint: 'e.g., "Premium pet food in the US" or "European fintech"',
            type: 'text',
            tags: ['research', 'mapping']
        },
        {
            id: 'geography',
            text: 'What geography or scope?',
            hint: 'e.g., "North America", "Global", "DACH region"',
            type: 'text',
            tags: ['research']
        },
        {
            id: 'timeHorizon',
            text: 'What time horizon?',
            hint: 'e.g., "Next 3\u20135 years", "Last 12 months", "Current state"',
            type: 'select',
            options: [
                'Current snapshot',
                'Last 12 months',
                'Next 1\u20132 years',
                'Next 3\u20135 years'
            ],
            tags: ['research']
        },
        {
            id: 'interviewFocus',
            text: 'What should the synthesis prioritize?',
            hint: 'Pick the most important.',
            type: 'select',
            options: [
                'Recurring themes across interviews',
                'Points of disagreement / tension',
                'Hypotheses and risks',
                'Quotable insights for a deck',
                'All of the above'
            ],
            tags: ['phase0']
        },
        {
            id: 'interviewCount',
            text: 'How many interviews / sources?',
            hint: 'Helps Copilot calibrate depth.',
            type: 'select',
            options: ['1\u20133', '4\u20138', '9\u201315', '15+'],
            tags: ['phase0']
        },
        {
            id: 'storyline',
            text: 'What\'s the storyline or arc?',
            hint: 'e.g., "Situation \u2192 Complication \u2192 Resolution" or "Problem \u2192 Options \u2192 Recommendation"',
            type: 'text',
            tags: ['deck']
        },
        {
            id: 'slideCount',
            text: 'How many slides / sections?',
            hint: 'Approximate is fine.',
            type: 'select',
            options: ['3\u20135 (short)', '6\u201310 (standard)', '11\u201320 (detailed)', 'Flexible'],
            tags: ['deck']
        },
        {
            id: 'emailTone',
            text: 'What\'s the relationship / tone?',
            hint: 'Helps Copilot match formality.',
            type: 'select',
            options: [
                'First contact \u2014 formal and professional',
                'Existing relationship \u2014 warm but professional',
                'Internal team \u2014 concise and direct',
                'Follow-up / reminder \u2014 polite nudge'
            ],
            tags: ['email']
        },
        {
            id: 'emailCTA',
            text: 'What\'s the ask or call to action?',
            hint: 'e.g., "Schedule a meeting", "Review the attached", "Approve next steps"',
            type: 'text',
            tags: ['email']
        },
        {
            id: 'mapDimensions',
            text: 'What dimensions to map?',
            hint: 'e.g., "Price vs. quality", "Geographic spread vs. segment focus"',
            type: 'text',
            tags: ['mapping']
        },
        {
            id: 'surveyObjective',
            text: 'What\'s the survey objective?',
            hint: 'What decision will the data inform?',
            type: 'text',
            tags: ['survey']
        },
        {
            id: 'surveyRespondent',
            text: 'Who\'s the target respondent?',
            hint: 'e.g., "B2B procurement managers", "Retail consumers 25\u201345"',
            type: 'text',
            tags: ['survey']
        },
        {
            id: 'scopeDepth',
            text: 'How deep should the output be?',
            hint: 'Quick scan for context vs. deep-dive analysis.',
            type: 'select',
            options: [
                'Quick scan (high-level, 1 page)',
                'Standard analysis (2\u20133 pages)',
                'Deep dive (comprehensive, detailed)'
            ],
            tags: ['research', 'phase0', 'mapping']
        },
        {
            id: 'context',
            text: 'Any other context for Copilot?',
            hint: 'Client name, project stage, specific constraints\u2026',
            type: 'text',
            tags: ['always_last']
        }
    ];

    // ==========================================================
    //  GOALS
    //  Each goal defines: id, label, icon, questionTags,
    //  defaultConstraints, defaultQualityChecks, roleHint,
    //  and followUpTemplates.
    // ==========================================================

    var GOALS = [
        {
            id: 'research',
            label: 'Market / Competitor Research',
            icon: '\uD83D\uDD0D',
            questionTags: ['always', 'research', 'always_last'],
            roleHint: 'an experienced market research analyst with deep expertise in competitive intelligence',
            defaultConstraints: ['Cite sources where possible', 'Flag any figures that are estimates vs. verified', 'Do not invent data'],
            defaultQualityChecks: ['Identify gaps in available data', 'Flag conflicting information'],
            followUps: [
                'Now create a SWOT analysis for [top competitor] based on the research above.',
                'Compare the top 3 players in a table across: revenue, market share, key differentiator, recent strategic move.',
                'Identify the 3 biggest risks to this market over the next 2 years.'
            ]
        },
        {
            id: 'phase0',
            label: 'Interview / Phase 0 Synthesis',
            icon: '\uD83D\uDDE3\uFE0F',
            questionTags: ['always', 'phase0', 'always_last'],
            roleHint: 'a strategy consultant synthesizing stakeholder interviews to identify patterns and build hypotheses',
            defaultConstraints: ['Tag insights to specific interviewees where possible', 'Do not invent quotes', 'Maintain confidentiality framing'],
            defaultQualityChecks: ['Highlight contradictions between interviewees', 'Identify risks flagged by stakeholders', 'Generate testable hypotheses', 'Produce slide-ready summary bullets'],
            followUps: [
                'Draft a 1-page executive summary of these interview themes for the project sponsor.',
                'Create a hypothesis tree: for each theme, list 2\u20133 testable hypotheses with suggested data sources.',
                'Identify the top 3 risks from these interviews and suggest mitigations.'
            ]
        },
        {
            id: 'deck',
            label: 'Deck / Storyline Drafting',
            icon: '\uD83D\uDCCA',
            questionTags: ['always', 'deck', 'always_last'],
            roleHint: 'an experienced strategy consultant who builds compelling, insight-driven presentations',
            defaultConstraints: ['Each slide headline should be an action-oriented "so what"', 'Keep bullets to 3\u20134 per slide', 'Suggest a visual or chart type for each slide'],
            defaultQualityChecks: ['Ensure logical flow between slides', 'Flag any slide that lacks a clear insight'],
            followUps: [
                'Rewrite each headline to be more action-oriented and insight-driven.',
                'Add speaker notes (2\u20133 sentences) for each slide.',
                'Create an appendix slide list for supporting data.'
            ]
        },
        {
            id: 'email',
            label: 'Client Email / Messaging',
            icon: '\u2709\uFE0F',
            questionTags: ['always', 'email', 'always_last'],
            roleHint: 'a professional consultant drafting client communications',
            defaultConstraints: ['Keep under 150 words', 'Professional tone \u2014 no internal slang', 'Clear call to action at the end'],
            defaultQualityChecks: [],
            followUps: [
                'Draft a follow-up version for if they don\'t respond within 3 days.',
                'Adjust this email for a more junior stakeholder (manager level).',
                'Rewrite in a more concise style \u2014 aim for under 100 words.'
            ]
        },
        {
            id: 'mapping',
            label: 'Market Mapping / Hypotheses',
            icon: '\uD83D\uDDFA\uFE0F',
            questionTags: ['always', 'mapping', 'always_last'],
            roleHint: 'a strategy consultant building market maps and competitive landscape analyses',
            defaultConstraints: ['Cite sources where possible', 'Flag estimates vs. confirmed data', 'Include "white space" or underserved areas'],
            defaultQualityChecks: ['Identify gaps in the landscape', 'Suggest hypotheses about market dynamics'],
            followUps: [
                'Identify 2\u20133 "white space" opportunities where no strong player exists.',
                'Generate 5 testable hypotheses about why the market is structured this way.',
                'Create a 2x2 matrix positioning the top players on [dimension A] vs. [dimension B].'
            ]
        },
        {
            id: 'survey',
            label: 'Survey / Questionnaire Review',
            icon: '\uD83D\uDCCB',
            questionTags: ['always', 'survey', 'always_last'],
            roleHint: 'a research methodologist experienced in survey design for consulting engagements',
            defaultConstraints: ['Questions should be unbiased and clear', 'Estimate LOI (length of interview)', 'Flag any questions that might confuse respondents'],
            defaultQualityChecks: ['Check for leading or double-barreled questions', 'Ensure all objectives are covered', 'Suggest any missing question areas'],
            followUps: [
                'Review these survey questions for bias and suggest improvements.',
                'Add 3 open-ended questions that would capture qualitative insights.',
                'Estimate the LOI and suggest which questions to cut to keep it under 10 minutes.'
            ]
        },
        {
            id: 'other',
            label: 'Other / General',
            icon: '\u2699\uFE0F',
            questionTags: ['always', 'always_last'],
            roleHint: 'an experienced strategy consultant',
            defaultConstraints: ['Be concise and actionable'],
            defaultQualityChecks: ['Flag any assumptions'],
            followUps: [
                'Refine the output \u2014 make the tone more confident and add specific examples.',
                'Summarize the key takeaways in 3 bullet points for an executive audience.',
                'What are the biggest risks or gaps in this analysis?'
            ]
        }
    ];

    // ==========================================================
    //  KEYWORD DETECTION (for draft mode auto-suggest)
    // ==========================================================

    var KEYWORD_MAP = [
        { goalId: 'phase0',   patterns: [/\bphase\s*0\b/i, /\bstakeholder\s+interview/i, /\binterview\s+synthe/i, /\binterview\s+theme/i, /\binterview\s+notes?\b/i] },
        { goalId: 'deck',     patterns: [/\bdeck\b/i, /\bslide/i, /\bpresentation\b/i, /\bstoryline\b/i, /\bpowerpoint\b/i] },
        { goalId: 'survey',   patterns: [/\bsurvey\b/i, /\bquestionnaire\b/i, /\bLOI\b/, /\brespondent/i] },
        { goalId: 'email',    patterns: [/\bemail\b/i, /\bmessag/i, /\boutreach\b/i, /\bfollow[\s-]?up\b/i] },
        { goalId: 'mapping',  patterns: [/\bmarket\s+map/i, /\blandscape\b/i, /\bhypothes[ie]/i, /\bwhite\s+space\b/i, /\b2x2\b/i] },
        { goalId: 'research', patterns: [/\bmarket\s+(size|siz)/i, /\bcompetit/i, /\bindustry\b/i, /\bTAM\b/, /\bSAM\b/, /\btrend/i, /\bresearch\b/i] }
    ];

    // ==========================================================
    //  GAP DETECTION (for draft mode diagnostics)
    // ==========================================================

    var GAP_CHECKS = [
        {
            id: 'objective',
            label: 'Clear objective',
            patterns: [/\b(analyze|summarize|draft|write|create|generate|compare|list|outline|evaluate|review|build|design|identify|explain|develop|recommend|suggest|synthesize|brainstorm|propose|assess|map|calculate)\b/i],
            fix: 'Add a clear action verb \u2014 what should Copilot do? (analyze, summarize, draft, compare\u2026)'
        },
        {
            id: 'audience',
            label: 'Audience specified',
            patterns: [/\b(audience|reader|stakeholder|for\s+(a|the|my|our)\s+\w+)/i, /\bc-suite\b/i, /\b(executive|partner|manager|director|VP|board|team|client)\b/i],
            fix: 'Specify the audience \u2014 who will read this? (e.g., "for a C-suite audience")'
        },
        {
            id: 'format',
            label: 'Output format defined',
            patterns: [/\b(table|bullet|list|slide|paragraph|summary|memo|email|report|outline|chart|matrix|format|column|heading|template)\b/i, /\b(present as|format as|structure as)\b/i],
            fix: 'Specify output format \u2014 bullets, table, slide outline, email, memo?'
        },
        {
            id: 'inputs',
            label: 'Inputs referenced',
            patterns: [/\b(paste|attach|below|following|this\s+(data|document|report|transcript|text|email|note))\b/i, /\[paste/i, /\bbased on\b/i],
            fix: 'Reference what you\'ll provide \u2014 "Based on the following notes\u2026" or "Using this data\u2026"'
        },
        {
            id: 'role',
            label: 'Role assigned',
            patterns: [/\b(act as|you are|as a|role of)\b/i, /\b(consultant|analyst|expert|advisor|strategist|researcher|specialist)\b/i],
            fix: 'Assign a role \u2014 "Act as an experienced strategy consultant with expertise in\u2026"'
        },
        {
            id: 'constraints',
            label: 'Constraints set',
            patterns: [/\b(under\s+\d+|keep\s+it|concise|brief|max|limit|word\s*count|don't|do\s+not|avoid|exclude|never|tone)\b/i],
            fix: 'Add constraints \u2014 word limit, tone, what to exclude, what to flag.'
        },
        {
            id: 'context',
            label: 'Context provided',
            patterns: [/\b(I'm|I am|we're|we are|our|my)\b.*\b(work|project|client|engagement|company)\b/i, /\b(situation|background|context)\b/i, /\b(industry|market|sector)\b/i],
            fix: 'Add context \u2014 what project, industry, or situation is this for?'
        }
    ];

    // ==========================================================
    //  SELECTION LOGIC — pick questions for a goal
    // ==========================================================

    function getQuestionsForGoal(goalId) {
        var goal = GOALS.find(function (g) { return g.id === goalId; });
        if (!goal) return [];
        var tags = goal.questionTags;
        return QUESTION_BANK.filter(function (q) {
            return q.tags.some(function (t) { return tags.indexOf(t) !== -1; });
        });
    }

    // ==========================================================
    //  PROMPT GENERATION ENGINE
    // ==========================================================

    // ==========================================================
    //  VARIATION ENGINE — slight phrasing differences each time
    // ==========================================================

    var _variationSeed = Date.now();
    function pick(arr) {
        _variationSeed = (_variationSeed * 9301 + 49297) % 233280;
        return arr[_variationSeed % arr.length];
    }

    var ROLE_OPENERS = [
        'Act as ',
        'You are ',
        'Take the role of ',
        'I need you to act as '
    ];

    var CONTEXT_INTROS = [
        'I\'m working on a consulting engagement',
        'I\'m preparing materials for a client project',
        'I\'m supporting a strategy engagement',
        'I\'m putting together deliverables for a consulting project'
    ];

    var INCLUDE_PHRASES = [
        'Please include',
        'Make sure to cover',
        'Include the following',
        'Be sure to address'
    ];

    var FORMAT_PHRASES = [
        'Present the output as',
        'Format your response as',
        'Structure the response as',
        'Deliver this as'
    ];

    var CONSTRAINT_INTROS = [
        'Keep in mind',
        'Important guidelines',
        'Please note',
        'A few constraints'
    ];

    var QC_PHRASES = [
        'Before finalizing, double-check for',
        'Before you finish, review for',
        'As a final step, verify',
        'Before wrapping up, check for'
    ];

    function generatePrompt(goalId, answers) {
        var goal = GOALS.find(function (g) { return g.id === goalId; });
        if (!goal) return '';

        var parts = [];

        // --- Opening: role + context in natural language ---
        var opener = pick(ROLE_OPENERS) + goal.roleHint + '.';
        var ctxIntro = pick(CONTEXT_INTROS);
        if (answers.context) {
            opener += ' ' + ctxIntro + ' \u2014 ' + answers.context + '.';
        } else if (answers.industry) {
            opener += ' ' + ctxIntro + ' focused on ' + answers.industry + '.';
        }
        parts.push(opener);

        // --- Task description in natural prose ---
        var taskParts = [];
        if (goalId === 'research') {
            var market = answers.industry || 'the target market';
            var depth = answers.scopeDepth ? answers.scopeDepth.toLowerCase() : 'standard';
            taskParts.push(pick([
                'I need a ' + depth + ' research overview of ' + market + '.',
                'Please conduct a ' + depth + ' analysis of ' + market + '.',
                'Help me build a ' + depth + ' fact base on ' + market + '.'
            ]));
            if (answers.geography) taskParts.push(pick(['Focus on ' + answers.geography + '.', 'Scope this to ' + answers.geography + '.']));
            if (answers.timeHorizon) taskParts.push(pick(['Time horizon: ' + answers.timeHorizon + '.', 'Looking at the ' + answers.timeHorizon.toLowerCase() + ' outlook.']));
        } else if (goalId === 'phase0') {
            var count = answers.interviewCount ? answers.interviewCount + ' interviews' : 'the interviews';
            var focus = answers.interviewFocus || 'recurring themes';
            taskParts.push(pick([
                'I need you to synthesize ' + count + ' and surface the key insights.',
                'Please analyze ' + count + ' and pull out the most important findings.',
                'Help me distill ' + count + ' into a structured synthesis.'
            ]));
            taskParts.push(pick(['Prioritize ' + focus + '.', 'Focus especially on ' + focus + '.']));
            taskParts.push('Where possible, tag insights to the specific interviewee who raised them.');
        } else if (goalId === 'deck') {
            var slides = answers.slideCount ? ' (' + answers.slideCount + ')' : '';
            taskParts.push(pick([
                'I need a slide outline' + slides + ' for a strategy presentation.',
                'Help me draft a deck outline' + slides + '.',
                'Please create a structured slide outline' + slides + ' for this presentation.'
            ]));
            if (answers.storyline) taskParts.push('The arc should follow: ' + answers.storyline + '.');
            taskParts.push(pick([
                'For each slide, provide an insight-driven headline, 3\u20134 supporting bullets, and a suggested visual or chart.',
                'Each slide should have a "so what" headline, 3\u20134 key bullets, and a recommended visual type.'
            ]));
        } else if (goalId === 'email') {
            taskParts.push(pick([
                'I need to draft a professional email.',
                'Help me write a polished client email.',
                'Please draft an email for me.'
            ]));
            if (answers.emailTone) taskParts.push('The tone should be: ' + answers.emailTone.toLowerCase() + '.');
            if (answers.emailCTA) taskParts.push('The main ask is: ' + answers.emailCTA + '.');
        } else if (goalId === 'mapping') {
            taskParts.push(pick([
                'I need a market map and competitive landscape.',
                'Help me build a competitive landscape visualization.',
                'Please create a structured market map.'
            ]));
            if (answers.mapDimensions) taskParts.push('Map players along these dimensions: ' + answers.mapDimensions + '.');
            if (answers.industry) taskParts.push('The market is ' + answers.industry + '.');
        } else if (goalId === 'survey') {
            taskParts.push(pick([
                'I need help designing a survey questionnaire.',
                'Please draft a survey for this research objective.',
                'Help me build a structured questionnaire.'
            ]));
            if (answers.surveyObjective) taskParts.push('The objective is: ' + answers.surveyObjective + '.');
            if (answers.surveyRespondent) taskParts.push('Target respondents are ' + answers.surveyRespondent + '.');
        } else {
            if (answers.context) {
                taskParts.push('Here\u2019s what I need help with: ' + answers.context + '.');
            } else {
                taskParts.push('Please help me with the following task.');
            }
        }
        parts.push(taskParts.join(' '));

        // --- Inputs ---
        if (answers.inputs) {
            if (answers.inputs.indexOf('Nothing yet') !== -1) {
                parts.push(pick([
                    'Use publicly available information to build this from scratch.',
                    'I don\u2019t have specific documents to share \u2014 please work from public sources.',
                    'Start from scratch using publicly available data and sources.'
                ]));
            } else {
                parts.push(pick([
                    'I will paste ' + answers.inputs.toLowerCase() + ' for you to work from.',
                    'I\u2019ll provide ' + answers.inputs.toLowerCase() + ' as input.',
                    'Below I\u2019ll share ' + answers.inputs.toLowerCase() + ' for reference.'
                ]));
            }
        }

        // --- Include list (goal-specific) ---
        var includeItems = [];
        if (goalId === 'research') {
            includeItems = ['Key players and their market positions', 'Market size and growth dynamics', 'Major trends shaping the industry', 'Risks and potential disruptions'];
        } else if (goalId === 'phase0') {
            includeItems = ['Recurring themes across interviews', 'Points of agreement and disagreement', 'Direct quotes that support key findings', 'Testable hypotheses emerging from the data'];
        } else if (goalId === 'mapping') {
            includeItems = ['Major players positioned on the map', 'Underserved areas or white space opportunities', 'Key differentiators between players', 'Hypotheses about market dynamics'];
        }
        if (includeItems.length > 0) {
            parts.push('\n' + pick(INCLUDE_PHRASES) + ':\n' + includeItems.map(function (i) { return '\u2022 ' + i; }).join('\n'));
        }

        // --- Audience ---
        if (answers.audience) {
            parts.push(pick([
                'The audience is ' + answers.audience.toLowerCase() + ', so calibrate the depth and tone accordingly.',
                'This is for ' + answers.audience.toLowerCase() + ' \u2014 keep the language and detail level appropriate.',
                'Tailor the output for ' + answers.audience.toLowerCase() + '.'
            ]));
        }

        // --- Format ---
        if (answers.outputFormat) {
            parts.push(pick(FORMAT_PHRASES) + ' ' + answers.outputFormat.toLowerCase() + '.');
        }

        // --- Constraints (woven into natural language) ---
        var constraints = (goal.defaultConstraints || []).slice();
        if (answers.audience && /client|executive|VP|partner|board/i.test(answers.audience)) {
            if (constraints.indexOf('Professional tone \u2014 no internal slang') === -1) {
                constraints.push('Use a professional tone \u2014 avoid internal jargon');
            }
            if (constraints.indexOf('Be concise') === -1) {
                constraints.push('Keep it concise and scannable');
            }
        }
        if (constraints.length > 0) {
            parts.push(pick(CONSTRAINT_INTROS) + ': ' + constraints.join('. ') + '.');
        }

        // --- Quality checks ---
        var qc = (goal.defaultQualityChecks || []).slice();
        if (qc.length > 0) {
            parts.push(pick(QC_PHRASES) + ': ' + qc.join(', ') + '.');
        }

        return parts.join('\n\n');
    }

    // ==========================================================
    //  DRAFT ANALYSIS — heuristic gap detection
    // ==========================================================

    function analyzeDraft(text) {
        var diagnostics = [];
        GAP_CHECKS.forEach(function (check) {
            var found = check.patterns.some(function (p) { return p.test(text); });
            diagnostics.push({
                id: check.id,
                label: check.label,
                found: found,
                fix: check.fix
            });
        });
        return diagnostics;
    }

    function detectGoalFromDraft(text) {
        for (var i = 0; i < KEYWORD_MAP.length; i++) {
            var entry = KEYWORD_MAP[i];
            var match = entry.patterns.some(function (p) { return p.test(text); });
            if (match) return entry.goalId;
        }
        return null;
    }

    function getMissingGaps(diagnostics) {
        return diagnostics.filter(function (d) { return !d.found; });
    }

    // Pick the highest-leverage follow-up questions (max 4)
    function getFollowUpQuestions(diagnostics, detectedGoalId) {
        var missing = getMissingGaps(diagnostics);
        var questions = [];

        // Map gap IDs to question bank entries
        var gapToQuestion = {
            audience: 'audience',
            format: 'outputFormat',
            inputs: 'inputs',
            context: 'context',
            role: null, // handled by auto-fix
            constraints: null, // handled by auto-fix
            objective: null   // handled by auto-fix
        };

        // Priority order: audience, format, inputs, context
        var priority = ['audience', 'format', 'inputs', 'context'];
        priority.forEach(function (gapId) {
            if (questions.length >= 4) return;
            var isMissing = missing.some(function (m) { return m.id === gapId; });
            if (isMissing && gapToQuestion[gapId]) {
                var q = QUESTION_BANK.find(function (qb) { return qb.id === gapToQuestion[gapId]; });
                if (q) questions.push(q);
            }
        });

        // Add 1 goal-specific question if detected
        if (detectedGoalId && questions.length < 4) {
            var goalQs = QUESTION_BANK.filter(function (q) {
                return q.tags.indexOf(detectedGoalId) !== -1;
            });
            if (goalQs.length > 0 && questions.indexOf(goalQs[0]) === -1) {
                questions.push(goalQs[0]);
            }
        }

        return questions;
    }

    // Build improved prompt from draft + follow-up answers
    function improveDraft(originalText, diagnostics, answers, detectedGoalId) {
        var goal = GOALS.find(function (g) { return g.id === detectedGoalId; }) || GOALS[GOALS.length - 1];
        var parts = [];
        var changes = [];

        // Add role if missing — woven naturally at the start
        if (!diagnostics.find(function (d) { return d.id === 'role'; }).found) {
            parts.push(pick(ROLE_OPENERS) + goal.roleHint + '.');
            changes.push('Added a consulting-specific role to set the right perspective.');
        }

        // Add context if missing
        if (!diagnostics.find(function (d) { return d.id === 'context'; }).found) {
            var ctxLine = pick(CONTEXT_INTROS);
            if (answers.context) ctxLine += ' \u2014 ' + answers.context;
            ctxLine += '.';
            parts.push(ctxLine);
            changes.push('Added project context so Copilot understands the situation.');
        }

        // Original prompt
        parts.push('');
        parts.push(originalText);

        // Add format if missing
        if (!diagnostics.find(function (d) { return d.id === 'format'; }).found) {
            var fmt = answers.outputFormat || 'a structured outline with clear sections and bullet points';
            parts.push('');
            parts.push(pick(FORMAT_PHRASES) + ' ' + fmt.toLowerCase() + '.');
            changes.push('Specified output format so Copilot structures the response correctly.');
        }

        // Add audience if missing
        if (!diagnostics.find(function (d) { return d.id === 'audience'; }).found) {
            var aud = answers.audience || 'a senior business executive';
            parts.push(pick([
                'The audience is ' + aud + ', so calibrate depth and tone accordingly.',
                'This will be read by ' + aud + ' \u2014 keep it appropriate for that level.',
                'Tailor the language and detail for ' + aud + '.'
            ]));
            changes.push('Added audience to calibrate tone and depth.');
        }

        // Add constraints if missing
        if (!diagnostics.find(function (d) { return d.id === 'constraints'; }).found) {
            var cons = goal.defaultConstraints.slice(0, 2);
            if (cons.length > 0) {
                parts.push(pick(CONSTRAINT_INTROS) + ': ' + cons.join('. ') + '.');
                changes.push('Added constraints (' + cons.join(', ').toLowerCase() + ').');
            }
        }

        // Add quality checks for certain goals
        if (goal.defaultQualityChecks.length > 0) {
            parts.push('');
            parts.push(pick(QC_PHRASES) + ': ' + goal.defaultQualityChecks.join(', ') + '.');
            changes.push('Added quality checks to catch gaps and risks.');
        }

        return {
            improvedPrompt: parts.join('\n'),
            changes: changes,
            followUps: goal.followUps
        };
    }

    // ==========================================================
    //  UI RENDERING
    // ==========================================================

    function createCoachUI(container) {
        container.innerHTML =
            '<div class="pc-tabs">' +
                '<button class="pc-tab pc-tab-active" data-tab="build">Build a Prompt</button>' +
                '<button class="pc-tab" data-tab="improve">Improve a Draft</button>' +
            '</div>' +
            '<div class="pc-panel pc-build-panel">' +
                '<div class="pc-step pc-step-goal">' +
                    '<p class="pc-step-label">What are you working on?</p>' +
                    '<div class="pc-goal-grid"></div>' +
                '</div>' +
                '<div class="pc-step pc-step-questions" hidden>' +
                    '<p class="pc-step-label">A few details to sharpen your prompt</p>' +
                    '<div class="pc-questions-list"></div>' +
                    '<div class="pc-step-actions">' +
                        '<button class="btn btn-primary pc-generate-btn">Generate Prompt</button>' +
                        '<button class="btn btn-outline pc-back-btn">Back</button>' +
                    '</div>' +
                '</div>' +
                '<div class="pc-step pc-step-result" hidden></div>' +
            '</div>' +
            '<div class="pc-panel pc-improve-panel" hidden>' +
                '<div class="pc-improve-input">' +
                    '<label class="pc-step-label">Paste your draft prompt</label>' +
                    '<textarea class="pc-draft-textarea" rows="5" placeholder="e.g., Summarize this report for my client\u2026"></textarea>' +
                    '<div class="pc-improve-goal-row">' +
                        '<label>Goal <span class="pc-hint">(optional \u2014 helps tailor feedback)</span></label>' +
                        '<select class="pc-improve-goal-select">' +
                            '<option value="">Auto-detect</option>' +
                        '</select>' +
                    '</div>' +
                    '<button class="btn btn-primary pc-analyze-draft-btn">Analyze My Prompt</button>' +
                '</div>' +
                '<div class="pc-improve-results" hidden></div>' +
            '</div>';

        // Populate goal buttons
        var goalGrid = container.querySelector('.pc-goal-grid');
        var goalSelect = container.querySelector('.pc-improve-goal-select');
        GOALS.forEach(function (g) {
            var btn = document.createElement('button');
            btn.className = 'pc-goal-btn';
            btn.setAttribute('data-goal', g.id);
            btn.innerHTML = '<span class="pc-goal-icon">' + g.icon + '</span> ' + esc(g.label);
            goalGrid.appendChild(btn);

            var opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.label;
            goalSelect.appendChild(opt);
        });

        // --- State ---
        var selectedGoal = null;

        // --- Tab switching ---
        var tabs = container.querySelectorAll('.pc-tab');
        var buildPanel = container.querySelector('.pc-build-panel');
        var improvePanel = container.querySelector('.pc-improve-panel');

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('pc-tab-active'); });
                tab.classList.add('pc-tab-active');
                if (tab.getAttribute('data-tab') === 'build') {
                    buildPanel.hidden = false;
                    improvePanel.hidden = true;
                } else {
                    buildPanel.hidden = true;
                    improvePanel.hidden = false;
                }
            });
        });

        // --- BUILD MODE ---

        var stepGoal = container.querySelector('.pc-step-goal');
        var stepQuestions = container.querySelector('.pc-step-questions');
        var stepResult = container.querySelector('.pc-step-result');
        var questionsList = container.querySelector('.pc-questions-list');

        // Goal selection
        goalGrid.addEventListener('click', function (e) {
            var btn = e.target.closest('.pc-goal-btn');
            if (!btn) return;
            selectedGoal = btn.getAttribute('data-goal');
            goalGrid.querySelectorAll('.pc-goal-btn').forEach(function (b) {
                b.classList.remove('pc-goal-selected');
            });
            btn.classList.add('pc-goal-selected');
            showBuildQuestions(selectedGoal);
        });

        function showBuildQuestions(goalId) {
            var questions = getQuestionsForGoal(goalId);
            questionsList.innerHTML = '';
            questions.forEach(function (q) {
                var group = document.createElement('div');
                group.className = 'pc-question-group';
                group.setAttribute('data-qid', q.id);
                var label = '<label>' + esc(q.text);
                if (q.hint) label += ' <span class="pc-hint">' + esc(q.hint) + '</span>';
                label += '</label>';
                group.innerHTML = label;

                if (q.type === 'select' && q.options) {
                    var sel = document.createElement('select');
                    sel.className = 'pc-input';
                    var defOpt = document.createElement('option');
                    defOpt.value = '';
                    defOpt.textContent = 'Select\u2026';
                    sel.appendChild(defOpt);
                    q.options.forEach(function (o) {
                        var opt = document.createElement('option');
                        opt.value = o;
                        opt.textContent = o;
                        sel.appendChild(opt);
                    });
                    group.appendChild(sel);
                } else {
                    var input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'pc-input';
                    input.placeholder = q.hint || '';
                    group.appendChild(input);
                }
                questionsList.appendChild(group);
            });

            stepGoal.hidden = true;
            stepQuestions.hidden = false;
            stepResult.hidden = true;
        }

        // Back button
        container.querySelector('.pc-back-btn').addEventListener('click', function () {
            stepGoal.hidden = false;
            stepQuestions.hidden = true;
            stepResult.hidden = true;
        });

        // Generate button
        container.querySelector('.pc-generate-btn').addEventListener('click', function () {
            if (!selectedGoal) return;
            var answers = collectAnswers(questionsList);
            var promptText = generatePrompt(selectedGoal, answers);
            var goal = GOALS.find(function (g) { return g.id === selectedGoal; });
            showBuildResult(promptText, goal);
        });

        function showBuildResult(promptText, goal) {
            stepGoal.hidden = true;
            stepQuestions.hidden = true;
            stepResult.hidden = false;

            var html =
                '<p class="pc-step-label">Your Prompt</p>' +
                '<pre class="pc-prompt-output">' + esc(promptText) + '</pre>' +
                '<div class="pc-result-actions">' +
                    '<button class="btn btn-primary pc-copy-result-btn">Copy Prompt</button>' +
                    '<button class="btn btn-outline pc-save-result-btn">Save to Account</button>' +
                    '<button class="btn btn-outline pc-reset-btn">Start Over</button>' +
                '</div>';

            if (goal && goal.followUps && goal.followUps.length > 0) {
                html += '<div class="pc-followups">' +
                    '<p class="pc-followups-label">Suggested follow-up prompts</p>' +
                    '<ul>' + goal.followUps.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
                '</div>';
            }

            stepResult.innerHTML = html;

            // Copy
            stepResult.querySelector('.pc-copy-result-btn').addEventListener('click', function () {
                var btn = this;
                navigator.clipboard.writeText(promptText).then(function () {
                    btn.textContent = 'Copied!';
                    setTimeout(function () { btn.textContent = 'Copy Prompt'; }, 2000);
                });
            });

            // Save
            stepResult.querySelector('.pc-save-result-btn').addEventListener('click', function () {
                var btn = this;
                if (window.DCProgress) {
                    DCProgress.savePrompt({
                        title: goal ? goal.label + ' Prompt' : 'Custom Prompt',
                        category: goal ? goal.label : 'General',
                        prompt: promptText
                    });
                    btn.textContent = 'Saved!';
                    setTimeout(function () { btn.textContent = 'Save to Account'; }, 2000);
                }
            });

            // Reset
            stepResult.querySelector('.pc-reset-btn').addEventListener('click', function () {
                selectedGoal = null;
                goalGrid.querySelectorAll('.pc-goal-btn').forEach(function (b) {
                    b.classList.remove('pc-goal-selected');
                });
                stepGoal.hidden = false;
                stepQuestions.hidden = true;
                stepResult.hidden = true;
            });

            stepResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // --- IMPROVE MODE ---

        var draftTextarea = container.querySelector('.pc-draft-textarea');
        var improveGoalSelect = container.querySelector('.pc-improve-goal-select');
        var improveResults = container.querySelector('.pc-improve-results');

        container.querySelector('.pc-analyze-draft-btn').addEventListener('click', function () {
            var draftText = draftTextarea.value.trim();
            if (!draftText) {
                draftTextarea.focus();
                return;
            }

            var diagnostics = analyzeDraft(draftText);
            var chosenGoal = improveGoalSelect.value || detectGoalFromDraft(draftText);

            // Auto-set dropdown if detected
            if (!improveGoalSelect.value && chosenGoal) {
                improveGoalSelect.value = chosenGoal;
            }

            var missing = getMissingGaps(diagnostics);
            var followUpQs = getFollowUpQuestions(diagnostics, chosenGoal);

            // Score
            var found = diagnostics.filter(function (d) { return d.found; }).length;
            var total = diagnostics.length;

            // Build results HTML
            var html =
                '<div class="pc-diagnostic">' +
                    '<p class="pc-step-label">Prompt Diagnostic</p>' +
                    '<div class="pc-diag-score">' + found + ' / ' + total + ' elements detected</div>' +
                    '<div class="pc-diag-checklist">' +
                        diagnostics.map(function (d) {
                            return '<div class="pc-diag-item ' + (d.found ? 'pc-diag-pass' : 'pc-diag-warn') + '">' +
                                (d.found ? '\u2705 ' : '\u26A0\uFE0F ') + esc(d.label) +
                                (!d.found ? '<span class="pc-diag-fix">' + esc(d.fix) + '</span>' : '') +
                            '</div>';
                        }).join('') +
                    '</div>' +
                '</div>';

            if (followUpQs.length > 0) {
                html += '<div class="pc-improve-followup">' +
                    '<p class="pc-step-label">Fill in the gaps</p>' +
                    '<div class="pc-improve-questions"></div>' +
                    '<button class="btn btn-primary pc-improve-generate-btn">Improve Prompt</button>' +
                '</div>';
            } else {
                // No gaps — still allow improvement
                html += '<div class="pc-improve-followup">' +
                    '<p class="pc-step-label">Your prompt covers the essentials. Want to enhance it?</p>' +
                    '<button class="btn btn-primary pc-improve-generate-btn">Improve Prompt</button>' +
                '</div>';
            }

            improveResults.innerHTML = html;
            improveResults.hidden = false;

            // Populate follow-up question inputs
            var qContainer = improveResults.querySelector('.pc-improve-questions');
            if (qContainer) {
                followUpQs.forEach(function (q) {
                    var group = document.createElement('div');
                    group.className = 'pc-question-group';
                    group.setAttribute('data-qid', q.id);
                    group.innerHTML = '<label>' + esc(q.text) +
                        (q.hint ? ' <span class="pc-hint">' + esc(q.hint) + '</span>' : '') +
                        '</label>';

                    if (q.type === 'select' && q.options) {
                        var sel = document.createElement('select');
                        sel.className = 'pc-input';
                        var defOpt = document.createElement('option');
                        defOpt.value = '';
                        defOpt.textContent = 'Select\u2026';
                        sel.appendChild(defOpt);
                        q.options.forEach(function (o) {
                            var opt = document.createElement('option');
                            opt.value = o;
                            opt.textContent = o;
                            sel.appendChild(opt);
                        });
                        group.appendChild(sel);
                    } else {
                        var input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'pc-input';
                        input.placeholder = q.hint || '';
                        group.appendChild(input);
                    }
                    qContainer.appendChild(group);
                });
            }

            // Improve button
            improveResults.querySelector('.pc-improve-generate-btn').addEventListener('click', function () {
                var answers = collectAnswers(improveResults);
                var result = improveDraft(draftText, diagnostics, answers, chosenGoal || 'other');
                showImproveResult(result);
            });

            improveResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        function showImproveResult(result) {
            var html =
                '<div class="pc-diagnostic">' +
                    '<p class="pc-step-label">Improved Prompt</p>' +
                    '<pre class="pc-prompt-output">' + esc(result.improvedPrompt) + '</pre>' +
                    '<div class="pc-result-actions">' +
                        '<button class="btn btn-primary pc-copy-improved-btn">Copy Prompt</button>' +
                        '<button class="btn btn-outline pc-save-improved-btn">Save to Account</button>' +
                    '</div>' +
                '</div>';

            if (result.changes && result.changes.length > 0) {
                html += '<div class="pc-changes">' +
                    '<p class="pc-followups-label">What changed and why</p>' +
                    '<ul>' + result.changes.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
                '</div>';
            }

            if (result.followUps && result.followUps.length > 0) {
                html += '<div class="pc-followups">' +
                    '<p class="pc-followups-label">Suggested follow-up prompts</p>' +
                    '<ul>' + result.followUps.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
                '</div>';
            }

            html += '<div style="margin-top:1rem"><button class="btn btn-outline pc-improve-reset-btn">Analyze Another</button></div>';

            improveResults.innerHTML = html;

            // Copy
            improveResults.querySelector('.pc-copy-improved-btn').addEventListener('click', function () {
                var btn = this;
                navigator.clipboard.writeText(result.improvedPrompt).then(function () {
                    btn.textContent = 'Copied!';
                    setTimeout(function () { btn.textContent = 'Copy Prompt'; }, 2000);
                });
            });

            // Save
            improveResults.querySelector('.pc-save-improved-btn').addEventListener('click', function () {
                var btn = this;
                if (window.DCProgress) {
                    DCProgress.savePrompt({
                        title: 'Improved Prompt',
                        category: 'Prompt Coach',
                        prompt: result.improvedPrompt
                    });
                    btn.textContent = 'Saved!';
                    setTimeout(function () { btn.textContent = 'Save to Account'; }, 2000);
                }
            });

            // Reset
            improveResults.querySelector('.pc-improve-reset-btn').addEventListener('click', function () {
                draftTextarea.value = '';
                improveGoalSelect.value = '';
                improveResults.hidden = true;
                draftTextarea.focus();
            });
        }
    }

    // ==========================================================
    //  UTILITY
    // ==========================================================

    function collectAnswers(container) {
        var answers = {};
        container.querySelectorAll('.pc-question-group').forEach(function (group) {
            var qid = group.getAttribute('data-qid');
            var input = group.querySelector('.pc-input');
            if (input && input.value) {
                answers[qid] = input.value;
            }
        });
        return answers;
    }

    function esc(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ==========================================================
    //  AUTO-INIT
    // ==========================================================

    function autoInit() {
        document.querySelectorAll('.pc-coach-mount').forEach(function (el) {
            createCoachUI(el);
        });
    }

    // --- Expose ---
    window.DCPromptCoach = {
        createCoachUI: createCoachUI,
        analyzeDraft: analyzeDraft,
        generatePrompt: generatePrompt,
        GOALS: GOALS,
        QUESTION_BANK: QUESTION_BANK
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

})();
