// Frontend/src/components/PRConflictEditor.jsx
import  { useMemo, useState } from "react";
import PropTypes from "prop-types";

/**
 * PRConflictEditor
 *
 * Props:
 * - conflicts: array of hunks, each { a: [lines], o: [lines], b: [lines] }
 * - baseContent: optional full base text (string)
 * - sourceContent: optional full source text (string)
 * - targetContent: optional full target text (string)
 * - onResolve(resolvedText) : callback called with final resolved text (string)
 *
 * Behavior:
 * - Builds a helper "merged" text made from the conflict hunks (with markers),
 *   shows it in an editable textarea where user can edit freely.
 * - Shows per-hunk panes to inspect Source/Base/Target and "Use Source/Target/Base/Custom"
 *   buttons that insert that hunk's chosen resolution into the merged textarea at the cursor.
 * - Also provides quick actions to load the full source or full target into the editor as a starting point.
 *
 * Note: This component intentionally favors a manual-edit workflow (owner can edit merged text).
 * If you later store conflict *positions* on the server, you can do in-place replacements.
 */
export default function PRConflictEditor({
  conflicts = [],
  baseContent = "",
  sourceContent = "",
  targetContent = "",
  onResolve,
}) {
  // Build a mergedText from conflicts (markers) as a helpful starting point.
  const initialMergedText = useMemo(() => {
    if (!conflicts || conflicts.length === 0) {
      // fallback: prefer current target, else source, else base
      return targetContent || sourceContent || baseContent || "";
    }
    const lines = [];
    conflicts.forEach((h, idx) => {
      lines.push(`<<<<<<< SOURCE (hunk ${idx + 1})`);
      lines.push(...(h.a || []));
      lines.push("||||||| BASE");
      lines.push(...(h.o || []));
      lines.push(">>>>>>> TARGET");
      lines.push(...(h.b || []));
      lines.push(`<<<<<<< END (hunk ${idx + 1})`);
      // add a blank line between hunks to improve readability
      lines.push("");
    });
    return lines.join("\n");
  }, [conflicts, targetContent, sourceContent, baseContent]);

  const [mergedText, setMergedText] = useState(initialMergedText);
//   const [selectedHunkIndex, setSelectedHunkIndex] = useState(0);
  // custom editor per-hunk (string) if user wants to craft a custom resolution for that hunk
  const [customHunks, setCustomHunks] = useState({});

  // helper: convert array of lines -> string
  const linesToString = (lines) => (Array.isArray(lines) ? lines.join("\n") : (lines || ""));

  // Insert text at cursor in the merged textarea
  const insertAtCursor = (textareaRef, text) => {
    if (!textareaRef) return;
    const el = textareaRef;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = mergedText.slice(0, start);
    const after = mergedText.slice(end);
    const newText = before + text + after;
    setMergedText(newText);
    // move cursor after inserted text (small delay to ensure DOM updated)
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    }, 0);
  };

  // We will capture textarea ref to support insertAtCursor
  let textareaRef = null;

  // Helper to create the resolution string for a hunk depending on choice
  const buildHunkResolutionString = (hunk, choice, customStr) => {
    // choice: "source" | "target" | "base" | "custom"
    if (choice === "source") return linesToString(hunk.a || []);
    if (choice === "target") return linesToString(hunk.b || []);
    if (choice === "base") return linesToString(hunk.o || []);
    if (choice === "custom") return customStr ?? "";
    return "";
  };

  // When user clicks 'Use X for hunk', we'll append that chosen snippet into the merged textarea at cursor.
  const onUseForHunk = (index, choice) => {
    const hunk = conflicts[index];
    const custom = customHunks[index] ?? "";
    const text = buildHunkResolutionString(hunk, choice, custom);
    // ensure a newline prefix/suffix for readability
    const snippet = `\n/* --- hunk ${index + 1} resolution (${choice}) --- */\n${text}\n/* --- end hunk ${index + 1} --- */\n`;
    insertAtCursor(textareaRef, snippet);
  };

  // Quick actions
  const loadFullSource = () => setMergedText(sourceContent || "");
  const loadFullTarget = () => setMergedText(targetContent || "");

  // Final apply: pass mergedText to parent
  const applyResolved = () => {
    if (!onResolve) return;
    onResolve(mergedText);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <strong>Conflict helper</strong>
          <div style={{ fontSize: 13, color: "#555" }}>
            Use the hunk controls to copy a chosen resolution into the editor below, then edit and click
            &nbsp;<em>Apply resolution</em>.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadFullSource} disabled={!sourceContent}>Load full source</button>
          <button onClick={loadFullTarget} disabled={!targetContent}>Load full target</button>
          <button onClick={() => setMergedText(initialMergedText)}>Reset helper merged text</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Conflict hunks</strong>
          </div>

          {(!conflicts || conflicts.length === 0) && (
            <div style={{ color: "#666", fontSize: 13 }}>No structured conflicts provided. Edit the merged text manually.</div>
          )}

          {conflicts && conflicts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {conflicts.map((h, idx) => (
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
                        // quick copy custom into clipboard
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
            ref={(el) => (textareaRef = el)}
            value={mergedText}
            onChange={(e) => setMergedText(e.target.value)}
            rows={20}
            style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 8, border: "1px solid #ddd", fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap" }}
          />

          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setMergedText(initialMergedText)}>Reset helper text</button>
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
  conflicts: PropTypes.array,
  baseContent: PropTypes.string,
  sourceContent: PropTypes.string,
  targetContent: PropTypes.string,
  onResolve: PropTypes.func.isRequired,
};
