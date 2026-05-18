// SmallCode — Per-Edit Undo Stack
// Tracks each file modification and allows reverting specific edits
// instead of just `git checkout -- .`

const fs = require('fs');
const path = require('path');

class UndoStack {
  constructor(maxSize = 50) {
    this.stack = []; // { id, type, path, before, after, timestamp }
    this.maxSize = maxSize;
    this.nextId = 1;
  }

  // Record a file write/patch before it happens
  recordWrite(filePath, contentBefore, contentAfter) {
    const entry = {
      id: this.nextId++,
      type: 'write',
      path: filePath,
      before: contentBefore, // null if new file
      after: contentAfter,
      timestamp: Date.now(),
    };
    this.stack.push(entry);
    if (this.stack.length > this.maxSize) this.stack.shift();
    return entry.id;
  }

  recordPatch(filePath, oldStr, newStr, fullBefore) {
    const entry = {
      id: this.nextId++,
      type: 'patch',
      path: filePath,
      before: fullBefore,
      oldStr,
      newStr,
      timestamp: Date.now(),
    };
    this.stack.push(entry);
    if (this.stack.length > this.maxSize) this.stack.shift();
    return entry.id;
  }

  // Undo the most recent edit
  undoLast() {
    if (this.stack.length === 0) return null;
    const entry = this.stack.pop();
    return this._revert(entry);
  }

  // Undo a specific edit by ID
  undoById(id) {
    const idx = this.stack.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const entry = this.stack.splice(idx, 1)[0];
    return this._revert(entry);
  }

  // List recent edits
  list(count = 10) {
    return this.stack.slice(-count).reverse().map(e => ({
      id: e.id,
      type: e.type,
      path: e.path,
      age: Math.floor((Date.now() - e.timestamp) / 1000),
    }));
  }

  _revert(entry) {
    const fullPath = path.resolve(process.cwd(), entry.path);
    try {
      if (entry.before === null) {
        // Was a new file — delete it
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        return { reverted: entry.path, action: 'deleted (was new file)' };
      } else {
        // Restore previous content
        fs.writeFileSync(fullPath, entry.before);
        return { reverted: entry.path, action: 'restored previous content' };
      }
    } catch (e) {
      return { error: `Failed to revert ${entry.path}: ${e.message}` };
    }
  }
}

module.exports = { UndoStack };
