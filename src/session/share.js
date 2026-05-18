// SmallCode — Session Sharing
// Export a session as a shareable markdown file or gist URL

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Export a session to a markdown file.
 */
function exportToMarkdown(session, outputPath) {
  let md = `# SmallCode Session: ${session.title || 'Untitled'}\n\n`;
  md += `**Model:** ${session.model}\n`;
  md += `**Date:** ${session.createdAt}\n`;
  md += `**Messages:** ${session.messages.length}\n\n`;
  md += `---\n\n`;

  for (const msg of session.messages) {
    if (msg.role === 'user') {
      md += `## You\n\n${msg.content}\n\n`;
    } else if (msg.role === 'assistant') {
      md += `## AI\n\n${msg.content}\n\n`;
    } else if (msg.role === 'tool') {
      md += `> Tool: ${msg.content.slice(0, 200)}\n\n`;
    }
  }

  fs.writeFileSync(outputPath, md);
  return outputPath;
}

/**
 * Export session as a GitHub Gist (requires gh CLI).
 */
function exportToGist(session) {
  const tmpFile = path.join(process.cwd(), `.smallcode-session-${session.id}.md`);
  exportToMarkdown(session, tmpFile);

  try {
    const output = execSync(
      `gh gist create "${tmpFile}" --desc "SmallCode session: ${(session.title || 'untitled').replace(/"/g, '')}" --public`,
      { encoding: 'utf-8', timeout: 15000 }
    );
    // Clean up temp file
    fs.unlinkSync(tmpFile);
    // Extract URL from gh output
    const url = output.trim().split('\n').pop();
    return { url, success: true };
  } catch (e) {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch {}
    return { error: e.message, success: false };
  }
}

module.exports = { exportToMarkdown, exportToGist };
