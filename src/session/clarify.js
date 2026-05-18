// SmallCode — Clarification Loop
// Detects vague/ambiguous prompts and asks the user for clarification
// before wasting tool calls on a misunderstood task.
//
// Triggers when:
// - Prompt is very short (<15 chars) and not a command
// - Prompt is ambiguous ("fix it", "make it better", "do the thing")
// - Multiple interpretations are possible

/**
 * Check if a user message is too vague to act on.
 * Returns true if clarification should be requested.
 */
function needsClarification(message) {
  const msg = message.trim();
  
  // Very short messages (unless they're file references or commands)
  if (msg.length < 15 && !msg.startsWith('@') && !msg.startsWith('/') && !msg.includes('.')) {
    return true;
  }

  // Vague patterns that lack specifics
  const vaguePatterns = [
    /^(fix|do|make|change|update|improve)\s+(it|this|that|things?)$/i,
    /^(help|please|can you|could you)$/i,
    /^(make it|do the|fix the)\s+(better|work|thing|stuff)$/i,
    /^(same|again|more|another)$/i,
    /^(yes|no|ok|sure|go|do it)$/i,
  ];

  return vaguePatterns.some(p => p.test(msg));
}

/**
 * Generate a clarification prompt to inject into the system message.
 * Tells the model to ask before acting.
 */
function getClarificationInstruction() {
  return `The user's message is vague or very short. Before taking action:
1. State what you THINK they want (your best interpretation)
2. Ask ONE specific clarifying question
3. Do NOT use any tools until the user confirms or clarifies.`;
}

module.exports = { needsClarification, getClarificationInstruction };
