import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DiffViewer from "react-diff-viewer-continued";
import PRConflictEditor from "../components/PRConflictEditor";
import { getPRApi, mergePRApi, resolveMergeApi, closePRApi, getNoteById } from "../api/NoteApi";
import { toast } from "react-toastify";


const Button = ({ children, onClick, variant = "primary", ...props }) => {
  const base =
    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
  const styles = {
    primary: base + " bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    ghost: base + " bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    danger: base + " bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };
  return (
    <button onClick={onClick} className={styles[variant]} {...props}>
      {children}
    </button>
  );
};

const Loader = ({ label = "Loading…" }) => (
  <div className="flex items-center justify-center p-8">
    <svg className="animate-spin h-6 w-6 mr-3 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
    <div className="text-sm text-gray-600">{label}</div>
  </div>
);

export default function MergePRPage() {
  const { prId } = useParams();
  const navigate = useNavigate();
  const [pr, setPr] = useState(null);
  const [targetNote, setTargetNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const prData = await getPRApi(prId);
      setPr(prData);
      const targetNoteId = prData?.target?.note;
      if (targetNoteId) {
        const res = await getNoteById(targetNoteId);       
       
        setTargetNote(res);
      }
    } catch (err) {
      console.error("Failed to load PR or target note", err);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [prId]);

  const attemptMerge = async () => {
    if (!window.confirm("Attempt to merge this PR into the target note?")) return;
    setBusy(true);
    try {
      await mergePRApi(prId);
      toast.success("Merged successfully.");
      navigate(`/mynotes/${pr.target.note}`);
    } // inside MergePRPage.jsx - where you catch the merge error
 catch (err) {
  // normalize different possible payload shapes into an array of hunks
  const payload = err?.data?.data ?? err?.data ?? err ?? {};
  // payload may be { conflicts: [...] } or { data: { conflicts: [...] } } or an array already
  const conflictsFromPayload =
    Array.isArray(payload)
      ? payload
      : (Array.isArray(payload.conflicts)
          ? payload.conflicts
          : (Array.isArray(payload.data?.conflicts) ? payload.data.conflicts : []));

  if (conflictsFromPayload.length > 0) {
    setConflicts(conflictsFromPayload);
    alert("Merge has conflicts — you must resolve them.");
  } else {
    // If no structured conflicts but server signaled conflict, store the whole payload
    // (the editor will gracefully fall back)
    setConflicts(payload);
    alert("Merge failed with conflict info (no structured hunks). Open the conflict editor to resolve manually.");
  }
    toast.error("Merge failed: " + (err.message || err));

    } finally { setBusy(false); }
  };

  const applyManualResolution = async (resolvedContent) => {
     if (!resolvedContent || String(resolvedContent).trim() === "") {
    toast.error("Resolved content is empty — please edit the merged result before applying.");
    return;
  }
    if (!window.confirm("Apply manual resolution and merge?")) return;
    setBusy(true);
    try {
      await resolveMergeApi(prId, resolvedContent);
      toast.success("Merged successfully after manual resolution.");
      navigate(`/mynotes/${pr.target.note}`);
    } catch (err) {
      console.error("Resolve failed", err);
      toast.error("Resolve failed: " + (err.message || err));
    } finally { setBusy(false); }
  };

  const ignorePR = async () => {
    if (!window.confirm("Ignore (close) this PR?")) return;
    try {
      await closePRApi(prId);
      alert("PR closed.");
      navigate("/prs/pending");
    } catch (err) {
      console.error("Close failed", err);
      alert("Close failed: " + (err.message || err));
    }
  };

  if (loading) return <Loader label="Loading PR…" />;
  if (!pr) return <div className="p-8 text-center text-gray-600">PR not found</div>;

  const safeFormat = (v) => {
    if (v == null) return "";
    if (typeof v === "object") {
      try { return JSON.stringify(v, null, 2); } catch { return String(v); }
    }
    try { const parsed = JSON.parse(v); return JSON.stringify(parsed, null, 2); } catch { return String(v); }
  };

  const leftContent = safeFormat(pr.source?.content ?? "");
  const rightContent = safeFormat(targetNote?.content ?? pr.target?.baseContent ?? "");

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Merge PR: {pr.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{pr.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={attemptMerge} disabled={busy}>Attempt Merge</Button>
            <Button onClick={ignorePR} variant="ghost">Ignore</Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-1 gap-4">
          <div className="col-span-1">
            <div className="text-xs text-gray-500 mb-2">Incoming (source)</div>
            <div className="border rounded-lg overflow-auto h-96">
              <DiffViewer oldValue={rightContent} newValue={leftContent} splitView={true} showDiffOnly={false} useDarkTheme={false} />
            </div>
          </div>

          <div className="col-span-1">
            <div className="text-xs text-gray-500 mb-2">Target (current)</div>
            <div className="border rounded-lg p-3 h-96 overflow-auto bg-gray-50">
              <pre className="text-sm whitespace-pre-wrap">{rightContent}</pre>
            </div>
          </div>
        </div>

        {conflicts && (
          <div className="mt-6">
            <h3 className="text-lg font-medium">Conflicts — manual resolution required</h3>
            <div className="mt-3 bg-white border rounded-lg p-4">
              <PRConflictEditor
                conflicts={conflicts}
                baseContent={pr.target.baseContent}
                sourceContent={pr.source.content}
                targetContent={targetNote?.content ?? pr.target?.baseContent}
                onResolve={applyManualResolution}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
