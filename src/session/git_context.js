// SmallCode — Auto Git Context
// When user mentions "fix tests", "fix the bug", "what changed", etc.
// automatically include recent git diff as context

const { execSync } = require('child_process');

/**
 * Detect if the user's message implies they want context about recent changes.
 */
function shouldInjectGitContext(message) {
  const triggers = [
    /\b(fix|debug|broken|failing|error|bug)\b.*\b(test|spec|check)\b/i,
    /\bwhat('s| is| did).*chang/i,
    /\brecent (change|commit|edit|update)/i,
    /\bfix (the|this|my)\b/i,
    /\bwhy (is|does|did).*fail/i,
    /\brevert\b/i,
    /\blast (change|commit|edit)/i,
  ];
  return triggers.some(re => re.test(message));
}

/**
 * Get recent git diff context (staged + unstaged changes).
 * Returns formatted string for injection, or empty string.
 */
function getGitDiffContext(cwd, maxLines = 100) {
  try {
    // Check if we're in a git repo
    execSync('git rev-parse --git-dir', { cwd, encoding: 'utf-8', timeout: 3000 });
  } catch {
    return '';
  }

  let diff = '';
  try {
    // Unstaged changes
    const unstaged = execSync('git diff --stat --no-color', { cwd, encoding: 'utf-8', timeout: 5000 }).trim();
    if (unstaged) {
      diff += `Unstaged changes:\n${unstaged}\n\n`;
      // Get actual diff (limited)
      const fullDiff = execSync('git diff --no-color', { cwd, encoding: 'utf-8', timeout: 5000 });
      const lines = fullDiff.split('\n').slice(0, maxLines);
      diff += lines.join('\n');
      if (fullDiff.split('\n').length > maxLines) {
        diff += `\n... (${fullDiff.split('\n').length - maxLines} more lines)`;
      }
    }
  } catch {}

  try {
    // Staged changes
    const staged = execSync('git diff --cached --stat --no-color', { cwd, encoding: 'utf-8', timeout: 5000 }).trim();
    if (staged && !diff.includes(staged)) {
      diff += `\nStaged changes:\n${staged}\n`;
    }
  } catch {}

  try {
    // Last commit message (for context on what was just done)
    const lastCommit = execSync('git log --oneline -1', { cwd, encoding: 'utf-8', timeout: 3000 }).trim();
    if (lastCommit) {
      diff += `\nLast commit: ${lastCommit}\n`;
    }
  } catch {}

  if (!diff.trim()) return '';
  return `\n\n--- Recent git changes ---\n${diff.trim()}\n`;
}

module.exports = { shouldInjectGitContext, getGitDiffContext };
