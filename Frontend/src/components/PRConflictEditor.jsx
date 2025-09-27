// Frontend/src/components/PRConflictEditor.jsx
import { useMemo, useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * PRConflictEditor (hardened)
 *
 * - Normalizes wrapper shapes (array or { conflicts: [...] } etc.)
 * - If hunks exist but are all empty, falls back to showing target/source/base
 * - Keeps mergedText in sync if props change
 * - Prevents inserting empty snippets and prevents submitting empty resolved text
 */
export default function PRConflictEditor({
  conflicts = [],
  baseContent = "",
  sourceContent = "",
  targetContent = "",
  onResolve,
}) {
  // normalize incoming prop: always produce an array of hunks
  const hunks = useMemo(() => {
    if (Array.isArray(conflicts)) return conflicts;
    if (!conflicts || typeof conflicts !== "object") return [];
    return Array.isArray(conflicts.conflicts)
      ? conflicts.conflicts
      : (Array.isArray(conflicts.data?.conflicts) ? conflicts.data.conflicts : []);
  }, [conflicts]);

  // helper to check whether a hunk has any non-empty content (a/o/b)
  const anyHunkHasContent = useMemo(() => {
    if (!hunks || hunks.length === 0) return false;
    return hunks.some((h) => {
      const aLen = Array.isArray(h.a) ? h.a.join("").trim().length : String(h.a ?? "").trim().length;
      const oLen = Array.isArray(h.o) ? h.o.join("").trim().length : String(h.o ?? "").trim().length;
      const bLen = Array.isArray(h.b) ? h.b.join("").trim().length : String(h.b ?? "").trim().length;
      return (aLen + oLen + bLen) > 0;
    });
  }, [hunks]);

  // Build a mergedText from hunks (markers) as a helpful starting point,
  // but if hunks are present and all empty, fallback to existing target/source/base content.
  const initialMergedText = useMemo(() => {
    if (!hunks || hunks.length === 0) {
      return targetContent || sourceContent || baseContent || "";
    }
    if (!anyHunkHasContent) {
      // all hunks empty -> prefer full target/source/base to avoid overwriting with empties
      return targetContent || sourceContent || baseContent || "";
    }

    const lines = [];
    hunks.forEach((h, idx) => {
      lines.push(`<<<<<<< SOURCE (hunk ${idx + 1})`);
      lines.push(...(Array.isArray(h.a) ? h.a : (h.a ? String(h.a).split("\n") : [])));
      lines.push("||||||| BASE");
      lines.push(...(Array.isArray(h.o) ? h.o : (h.o ? String(h.o).split("\n") : [])));
      lines.push(">>>>>>> TARGET");
      lines.push(...(Array.isArray(h.b) ? h.b : (h.b ? String(h.b).split("\n") : [])));
      lines.push(`<<<<<<< END (hunk ${idx + 1})`);
      lines.push("");
    });
    return lines.join("\n");
  }, [hunks, anyHunkHasContent, targetContent, sourceContent, baseContent]);

  const [mergedText, setMergedText] = useState(initialMergedText);
  // keep mergedText in sync when initialMergedText changes (e.g., after async load)
  useEffect(() => {
    setMergedText(initialMergedText);
  }, [initialMergedText]);

  const [customHunks, setCustomHunks] = useState({});
  const textareaRef = useRef(null);

  // helper: convert array of lines -> string
  const linesToString = (lines) => (Array.isArray(lines) ? lines.join("\n") : (lines ?? ""));

  // Insert text at cursor in the merged textarea
  const insertAtCursor = (text) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const before = mergedText.slice(0, start);
    const after = mergedText.slice(end);
    const newText = before + text + after;
    setMergedText(newText);
    // move cursor after inserted text
    setTimeout(() => {
      if (el.setSelectionRange) {
        el.setSelectionRange(start + text.length, start + text.length);
      } else {
        el.selectionStart = el.selectionEnd = start + text.length;
      }
      el.focus();
    }, 0);
  };

  const buildHunkResolutionString = (hunk, choice, customStr) => {
    if (!hunk) return "";
    if (choice === "source") return linesToString(hunk.a || []);
    if (choice === "target") return linesToString(hunk.b || []);
    if (choice === "base") return linesToString(hunk.o || []);
    if (choice === "custom") return customStr ?? "";
    return "";
  };

  const onUseForHunk = (index, choice) => {
    const hunk = hunks[index];
    const custom = customHunks[index] ?? "";
    const text = buildHunkResolutionString(hunk, choice, custom);
    if (!text || String(text).trim() === "") {
      // prevent inserting empty resolutions — helps avoid wiping note content
      alert("That hunk has no content for the chosen option.");
      return;
    }
    const snippet = `\n/* --- hunk ${index + 1} resolution (${choice}) --- */\n${text}\n/* --- end hunk ${index + 1} --- */\n`;
    insertAtCursor(snippet);
  };

  // Quick actions
  const loadFullSource = () => setMergedText(sourceContent || "");
  const loadFullTarget = () => setMergedText(targetContent || "");
  const resetHelper = () => setMergedText(initialMergedText);

  // Final apply: pass mergedText to parent — but block empty submissions
  const applyResolved = () => {
    if (!onResolve) return;
    if (!mergedText || mergedText.trim() === "") {
      alert("Resolved text is empty — please edit the merged result before applying.");
      return;
    }
    onResolve(mergedText);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <strong>Conflict helper</strong>
          <div style={{ fontSize: 13, color: "#555" }}>
            Use the hunk controls to copy a chosen resolution into the editor below, then edit and click <em>Apply resolution</em>.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadFullSource} disabled={!sourceContent}>Load full source</button>
          <button onClick={loadFullTarget} disabled={!targetContent}>Load full target</button>
          <button onClick={resetHelper}>Reset helper merged text</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Conflict hunks</strong>
          </div>

          {(!hunks || hunks.length === 0) && (
            <div style={{ color: "#666", fontSize: 13 }}>No structured conflicts provided. Edit the merged text manually.</div>
          )}

          {hunks && hunks.length > 0 && !anyHunkHasContent && (
            <div style={{ color: "#a00", fontSize: 13, marginBottom: 8 }}>
              Note: structured hunks were provided but contain no content. Showing full target/source instead to avoid accidental deletion.
            </div>
          )}

          {hunks && hunks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {hunks.map((h, idx) => (
                <div key={idx} style={{ border: "1px solid #eee", padding: 8, borderRadius: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>Hunk {idx + 1}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onUseForHunk(idx, "source")}>Use source</button>
                      <button onClick={() => onUseForHunk(idx, "target")}>Use target</button>
                      <button onClick={() => onUseForHunk(idx, "base")}>Use base</button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>Source</div>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#fafafa", padding: 8, borderRadius: 4 }}>{linesToString(h.a)}</pre>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>Base</div>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#fff8e6", padding: 8, borderRadius: 4 }}>{linesToString(h.o)}</pre>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>Target</div>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#f7fff7", padding: 8, borderRadius: 4 }}>{linesToString(h.b)}</pre>
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>Custom resolution for this hunk</div>
                    <textarea
                      value={customHunks[idx] ?? ""}
                      onChange={(e) => setCustomHunks(prev => ({ ...prev, [idx]: e.target.value }))}
                      placeholder="Type a custom resolution for this hunk..."
                      rows={3}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                    />
                    <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                      <button onClick={() => onUseForHunk(idx, "custom")}>Use custom</button>
                      <button onClick={() => {
                        const t = customHunks[idx] ?? "";
                        navigator.clipboard?.writeText(t);
                        alert("Custom hunk text copied to clipboard (paste into editor).");
                      }}>Copy custom</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 600 }}>Merged result (editable)</div>
            <div style={{ fontSize: 12, color: "#666" }}>Edit here to finalize resolution</div>
          </div>

          <textarea
            ref={textareaRef}
            value={mergedText}
            onChange={(e) => setMergedText(e.target.value)}
            rows={20}
            style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 8, border: "1px solid #ddd", fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap" }}
          />

          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={resetHelper}>Reset helper text</button>
            <button
              onClick={() => {
                if (!mergedText || mergedText.trim() === "") {
                  if (!window.confirm("Merged text is empty. Are you sure you want to apply this?")) return;
                }
                applyResolved();
              }}
              style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }}
            >
              Apply resolution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

PRConflictEditor.propTypes = {
  conflicts: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  baseContent: PropTypes.string,
  sourceContent: PropTypes.string,
  targetContent: PropTypes.string,
  onResolve: PropTypes.func.isRequired,
};
