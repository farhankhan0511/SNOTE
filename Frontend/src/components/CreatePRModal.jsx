// Frontend/src/components/CreatePRModal.jsx
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { createPRApi } from "../api/NoteApi";
import { black } from "@/utils/mediaUtils";
import { toast } from "react-toastify";

/**
 * CreatePRModal
 *
 * Props:
 * - sourceNoteId (string)        : id of the fork (source)
 * - sourceContent (string)       : snapshot/content from the fork editor (string)
 * - targetNoteId (string)        : id of the original/target note (optional; if not provided UI asks)
 * - onCreated(pr)                : callback after successful PR creation (receives created PR object)
 * - onClose()                    : callback to close the modal
 *
 * Usage:
 * <CreatePRModal
 *   sourceNoteId={note._id}
 *   sourceContent={note.content}
 *   targetNoteId={originalNoteId}
 *   onCreated={(pr) => { ... }}
 *   onClose={() => setOpen(false)}
 * />
 */
export default function CreatePRModal({
  sourceNoteId,
  sourceContent,
  targetNoteId: initialTargetNoteId = "",
  onCreated,
  onClose,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetNoteId, setTargetNoteId] = useState(initialTargetNoteId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // small accessibility: close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        if (onClose) onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    setError(null);

    if (!title.trim()) {
      setError("Please provide a short title for the Pull Request.");
      return;
    }
    if (!sourceNoteId) {
      setError("Source note id is missing - cannot create PR.");
      return;
    }
    if (!targetNoteId) {
      setError("Target note id is required. Provide the original note id to create a PR.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        sourceNoteId,
        sourceContent, // snapshot of your fork's content at PR creation
        targetNoteId,
      };

      const res = await createPRApi(payload);

      // many server helpers wrap responses in { data: ... } — handle both shapes
      const createdPR = res?.data ?? res;
      if (onCreated) onCreated(createdPR);
      if (onClose) onClose();
      toast.success("Pull Request created.");
    } catch (err) {
      console.error("Create PR failed", err);
      toast.error("Failed to create Pull Request.");
      // if createPRApi throws structured error, try to show message
      const msg = err?.message || (err?.data && JSON.stringify(err.data)) || "Failed to create PR";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="pr-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="pr-modal-card"
        style={{
          width: 720,
           height:"fit-content",
          maxWidth: "95%",
          background: "#fff",
          borderRadius: 8,
          padding: 20,
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          color: "black",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Create Pull Request</h3>
          <button
            onClick={() => onClose && onClose()}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 13, color: "#333" }}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary (e.g. Improve intro section)"
            style={{ width: "100%", padding: "8px 10px", marginTop: 6, borderRadius: 6, border: "1px solid #ddd" }}
            disabled={loading}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 13, color: "#333" }}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the changes and why they should be merged"
            rows={4}
            style={{ width: "100%", padding: "8px 10px", marginTop: 6, borderRadius: 6, border: "1px solid #ddd" }}
            disabled={loading}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 13, color: "#333" }}>Source note (fork)</label>
            <input
              value={sourceNoteId}
              readOnly
              style={{ width: "100%", padding: "8px 10px", marginTop: 6, borderRadius: 6, border: "1px solid #eee", background: "#fafafa" }}
            />
          </div>

          <div style={{ width: 260 }}>
            <label style={{ display: "block", fontSize: 13, color: "#333" }}>Target note (original)</label>
            <input
              value={targetNoteId}
              readOnly
              onChange={(e) => setTargetNoteId(e.target.value)}
              placeholder="Original note id (required)"
              style={{ width: "100%", padding: "8px 10px", marginTop: 6, borderRadius: 6, border: "1px solid #ddd" }}
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "crimson", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={() => onClose && onClose()}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={loading || !title.trim() || !targetNoteId}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: loading ? "#999" : "#2563eb",
              color: "#fff",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Creating…" : "Create PR"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
         
        </div>
      </div>
    </div>
  );
}

CreatePRModal.propTypes = {
  sourceNoteId: PropTypes.string.isRequired,
  sourceContent: PropTypes.string,
  targetNoteId: PropTypes.string,
  onCreated: PropTypes.func,
  onClose: PropTypes.func,
};
