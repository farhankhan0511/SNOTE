// Server/utils/merge3way.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// use node-diff3 which exposes diff3Merge, merge, etc.
const Diff3 = require("node-diff3");

/**
 * threeWayMerge(baseText, targetText, sourceText)
 * returns { mergedText, conflict: boolean, conflicts: [...] }
 */
export function threeWayMerge(baseText = "", targetText = "", sourceText = "") {
  // split by lines (keep same semantics you had)
  const base = String(baseText).split("\n");
  const a = String(sourceText).split("\n"); // source (incoming)
  const b = String(targetText).split("\n"); // target (current)

  // First try the structured API (diff3Merge) which returns blocks with ok/conflict
  let raw = null;
  try {
    // diff3Merge(a, o, b) - note ordering: a = source, o = base, b = target
    raw = typeof Diff3.diff3Merge === "function" ? Diff3.diff3Merge(a, base, b) : null;
  } catch (err) {
    // swallow and fallback
    raw = null;
  }

  // If diff3Merge didn't produce blocks, try Diff3.merge which returns { result: [...] }
  if (!Array.isArray(raw)) {
    try {
      const r = typeof Diff3.merge === "function" ? Diff3.merge(a, base, b) : null;
      if (r && Array.isArray(r.result)) {
        // r.result is an array of strings and conflict markers like '<<<<<<<', '=======' etc.
        // We'll parse that into blocks (ok vs conflict) to keep same output shape as before.
        const resultArr = r.result;
        const mergedLines = [];
        const conflicts = [];

        // If there are git-style markers in resultArr, just join and return with conflicts found.
        // We'll detect presence of '<<<<<<<' markers to indicate conflicts.
        const hasMarkers = resultArr.some((s) => typeof s === "string" && s.startsWith("<<<<<<<"));
        if (hasMarkers) {
          // join into mergedText, but also attempt to parse conflict blocks out
          let i = 0;
          while (i < resultArr.length) {
            const line = resultArr[i];
            if (typeof line === "string" && line.startsWith("<<<<<<<")) {
              // parse until '>>>>>>>' (this parsing is conservative)
              const aBlock = [];
              const oBlock = []; // not present in this style; keep empty
              const bBlock = [];

              // Skip the '<<<<<<<' token
              i++;
              // gather source side until '======='
              while (i < resultArr.length && resultArr[i] !== "=======" && !resultArr[i].startsWith("=======")) {
                aBlock.push(resultArr[i]);
                i++;
              }
              // skip '======='
              if (i < resultArr.length && (resultArr[i] === "=======" || resultArr[i].startsWith("======="))) i++;
              // gather target side until '>>>>>>>'
              while (i < resultArr.length && !(typeof resultArr[i] === "string" && resultArr[i].startsWith(">>>>>>>"))) {
                bBlock.push(resultArr[i]);
                i++;
              }
              // skip '>>>>>>>' token
              if (i < resultArr.length && (typeof resultArr[i] === "string" && resultArr[i].startsWith(">>>>>>>"))) i++;

              conflicts.push({ a: aBlock, o: oBlock, b: bBlock });

              // For mergedLines, also include the conflict marker block so frontend can show them
              mergedLines.push("<<<<<<< SOURCE");
              mergedLines.push(...aBlock);
              mergedLines.push("||||||| BASE");
              mergedLines.push(...oBlock);
              mergedLines.push(">>>>>>> TARGET");
              mergedLines.push(...bBlock);
              mergedLines.push("<<<<<<< END");
            } else {
              // normal ok line token
              mergedLines.push(line);
              i++;
            }
          }

          return {
            mergedText: mergedLines.join("\n"),
            conflict: conflicts.length > 0,
            conflicts,
          };
        } else {
          // no markers -> treat as successful merged result
          return {
            mergedText: resultArr.join("\n"),
            conflict: false,
            conflicts: [],
          };
        }
      }
    } catch (err) {
      // fallback below
    }
  }

  // If we got structured blocks from diff3Merge, they typically look like:
  // [ { ok: [ ...lines ] }, { a: [...], o: [...], b: [...] }, { ok: [...] }, ... ]
  const mergeResultBlocks = Array.isArray(raw) ? raw : [];

  const mergedLines = [];
  const conflicts = [];

  for (const h of mergeResultBlocks) {
    if (h && h.ok) {
      mergedLines.push(...h.ok);
    } else {
      // conflict block should have a, o, b arrays
      const aBlock = h.a || [];
      const oBlock = h.o || [];
      const bBlock = h.b || [];

      conflicts.push({ a: aBlock, o: oBlock, b: bBlock });

      // include markers so frontend can show conflict if desired
      mergedLines.push("<<<<<<< SOURCE");
      mergedLines.push(...aBlock);
      mergedLines.push("||||||| BASE");
      mergedLines.push(...oBlock);
      mergedLines.push(">>>>>>> TARGET");
      mergedLines.push(...bBlock);
      mergedLines.push("<<<<<<< END");
    }
  }

  return {
    mergedText: mergedLines.join("\n"),
    conflict: conflicts.length > 0,
    conflicts,
  };
}
