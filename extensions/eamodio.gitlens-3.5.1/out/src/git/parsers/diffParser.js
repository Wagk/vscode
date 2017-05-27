'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const unifiedDiffRegex = /^@@ -([\d]+),([\d]+) [+]([\d]+),([\d]+) @@([\s\S]*?)(?=^@@)/gm;
class GitDiffParser {
    static parse(data, debug = false) {
        if (!data)
            return undefined;
        const chunks = [];
        let match = null;
        do {
            match = unifiedDiffRegex.exec(`${data}\n@@`);
            if (match == null)
                break;
            const originalStart = +match[1];
            const changedStart = +match[3];
            const chunk = match[5];
            const lines = chunk.split('\n').slice(1);
            const original = lines.filter(l => l[0] !== '+').map(l => (l[0] === '-') ? l.substring(1) : undefined);
            const changed = lines.filter(l => l[0] !== '-').map(l => (l[0] === '+') ? l.substring(1) : undefined);
            chunks.push({
                chunk: debug ? chunk : undefined,
                original: original,
                originalStart: originalStart,
                originalEnd: originalStart + +match[2],
                changes: changed,
                changesStart: changedStart,
                changesEnd: changedStart + +match[4]
            });
        } while (match != null);
        if (!chunks.length)
            return undefined;
        const diff = {
            diff: debug ? data : undefined,
            chunks: chunks
        };
        return diff;
    }
}
exports.GitDiffParser = GitDiffParser;
//# sourceMappingURL=diffParser.js.map