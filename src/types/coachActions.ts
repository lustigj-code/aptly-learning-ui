/**
 * Coach Action Types
 *
 * Phase 3: Defines actions the AI coach can suggest.
 * These are parsed from AI responses and rendered as interactive buttons.
 *
 * Format in AI response: [ACTION:type:payload]
 * Example: [ACTION:navigate:next_lesson]
 * Example: [ACTION:show_hint:Remember that X relates to Y]
 */

// ============================================
// ACTION TYPES
// ============================================

/**
 * Navigation actions - direct user to different content
 */
export type NavigateAction = {
  type: 'navigate';
  target: 'next_lesson' | 'previous_lesson' | 'review_content' | 'retry_quiz' | 'practice_more';
  label?: string;
};

/**
 * Show hint action - display additional help
 */
export type ShowHintAction = {
  type: 'show_hint';
  content: string;
  label?: string;
};

/**
 * Highlight concept action - emphasize a specific concept
 */
export type HighlightConceptAction = {
  type: 'highlight_concept';
  conceptId: string;
  conceptName: string;
  label?: string;
};

/**
 * Suggest break action - recommend taking a break
 */
export type SuggestBreakAction = {
  type: 'suggest_break';
  reason: string;
  duration?: number; // suggested minutes
  label?: string;
};

/**
 * Mark understood action - mark a concept as understood
 */
export type MarkUnderstoodAction = {
  type: 'mark_understood';
  conceptId: string;
  conceptName: string;
  label?: string;
};

/**
 * Open resource action - open external/internal resource
 */
export type OpenResourceAction = {
  type: 'open_resource';
  resourceType: 'video' | 'article' | 'example' | 'glossary';
  resourceId?: string;
  url?: string;
  label?: string;
};

/**
 * Union type of all coach actions
 */
export type CoachAction =
  | NavigateAction
  | ShowHintAction
  | HighlightConceptAction
  | SuggestBreakAction
  | MarkUnderstoodAction
  | OpenResourceAction;

// ============================================
// PARSING
// ============================================

/**
 * Action marker regex pattern
 * Matches: [ACTION:type:payload]
 * payload can be simple string or JSON for complex actions
 */
const ACTION_PATTERN = /\[ACTION:(\w+):([^\]]+)\]/g;

/**
 * Parse action markers from AI response text
 * Returns array of actions and the message with markers removed
 */
export function parseCoachActions(message: string): {
  actions: CoachAction[];
  cleanMessage: string;
} {
  const actions: CoachAction[] = [];
  let cleanMessage = message;

  // Find all action markers
  const matches = message.matchAll(ACTION_PATTERN);

  for (const match of matches) {
    const [fullMatch, actionType, payload] = match;

    try {
      const action = parseAction(actionType, payload);
      if (action) {
        actions.push(action);
      }
    } catch (error) {
      console.warn(`Failed to parse action: ${fullMatch}`, error);
    }

    // Remove the action marker from the message
    cleanMessage = cleanMessage.replace(fullMatch, '').trim();
  }

  return { actions, cleanMessage };
}

/**
 * Parse individual action from type and payload
 */
function parseAction(type: string, payload: string): CoachAction | null {
  switch (type) {
    case 'navigate':
      return parseNavigateAction(payload);
    case 'show_hint':
      return parseShowHintAction(payload);
    case 'highlight_concept':
      return parseHighlightConceptAction(payload);
    case 'suggest_break':
      return parseSuggestBreakAction(payload);
    case 'mark_understood':
      return parseMarkUnderstoodAction(payload);
    case 'open_resource':
      return parseOpenResourceAction(payload);
    default:
      console.warn(`Unknown action type: ${type}`);
      return null;
  }
}

function parseNavigateAction(payload: string): NavigateAction | null {
  const validTargets = ['next_lesson', 'previous_lesson', 'review_content', 'retry_quiz', 'practice_more'] as const;
  const target = payload.trim() as typeof validTargets[number];

  if (!validTargets.includes(target)) {
    return null;
  }

  return {
    type: 'navigate',
    target,
    label: getDefaultLabel('navigate', target),
  };
}

function parseShowHintAction(payload: string): ShowHintAction {
  return {
    type: 'show_hint',
    content: payload.trim(),
    label: 'Show Hint',
  };
}

function parseHighlightConceptAction(payload: string): HighlightConceptAction | null {
  // Expect format: conceptId|conceptName
  const [conceptId, conceptName] = payload.split('|').map(s => s.trim());
  if (!conceptId) return null;

  return {
    type: 'highlight_concept',
    conceptId,
    conceptName: conceptName || conceptId,
    label: `Review: ${conceptName || conceptId}`,
  };
}

function parseSuggestBreakAction(payload: string): SuggestBreakAction {
  return {
    type: 'suggest_break',
    reason: payload.trim(),
    duration: 5,
    label: 'Take a Break',
  };
}

function parseMarkUnderstoodAction(payload: string): MarkUnderstoodAction | null {
  const [conceptId, conceptName] = payload.split('|').map(s => s.trim());
  if (!conceptId) return null;

  return {
    type: 'mark_understood',
    conceptId,
    conceptName: conceptName || conceptId,
    label: 'I understand this',
  };
}

function parseOpenResourceAction(payload: string): OpenResourceAction | null {
  // Expect format: type|id_or_url
  const [resourceType, resource] = payload.split('|').map(s => s.trim());
  const validTypes = ['video', 'article', 'example', 'glossary'] as const;

  if (!validTypes.includes(resourceType as typeof validTypes[number])) {
    return null;
  }

  return {
    type: 'open_resource',
    resourceType: resourceType as typeof validTypes[number],
    resourceId: resource?.startsWith('http') ? undefined : resource,
    url: resource?.startsWith('http') ? resource : undefined,
    label: `View ${resourceType}`,
  };
}

// ============================================
// HELPERS
// ============================================

function getDefaultLabel(type: string, target?: string): string {
  const labels: Record<string, string> = {
    'navigate:next_lesson': 'Continue to Next Lesson',
    'navigate:previous_lesson': 'Go Back',
    'navigate:review_content': 'Review Content',
    'navigate:retry_quiz': 'Try Quiz Again',
    'navigate:practice_more': 'Practice More',
  };

  return labels[`${type}:${target}`] || target || type;
}

/**
 * Get action button styling based on action type
 */
export function getActionButtonStyle(action: CoachAction): {
  variant: 'primary' | 'secondary' | 'outline';
  icon: string;
} {
  switch (action.type) {
    case 'navigate':
      return { variant: 'primary', icon: 'arrow-right' };
    case 'show_hint':
      return { variant: 'secondary', icon: 'lightbulb' };
    case 'highlight_concept':
      return { variant: 'outline', icon: 'bookmark' };
    case 'suggest_break':
      return { variant: 'secondary', icon: 'coffee' };
    case 'mark_understood':
      return { variant: 'outline', icon: 'check-circle' };
    case 'open_resource':
      return { variant: 'outline', icon: 'external-link' };
    default:
      return { variant: 'outline', icon: 'arrow-right' };
  }
}
