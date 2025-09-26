import  { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getPendingPRsApi, closePRApi } from "../api/NoteApi";

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

export default function PendingPRsPage() {
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchPRs(); }, []);

  async function fetchPRs() {
    setLoading(true);
    try {
      const data = await getPendingPRsApi();
      setPrs(data || []);
    } catch (err) {
      console.error("Failed to load PRs", err);
      setPrs([]);
    } finally { setLoading(false); }
  }

  async function ignorePR(prId) {
    if (!window.confirm("Ignore (close) this PR?")) return;
    try {
      await closePRApi(prId);
      await fetchPRs();
      alert("PR closed (ignored).");
    } catch (err) {
      console.error(err);
      alert("Failed to close PR: " + (err.message || err));
    }
  }

  if (loading) return <Loader label="Loading pull requests…" />;
  if (!prs || prs.length === 0) return <div className="p-8 text-center text-gray-600">No pending PRs.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pending Pull Requests</h1>
        <Button onClick={fetchPRs} variant="ghost">Refresh</Button>
      </div>

      <ul className="mt-6 grid gap-4">
        {prs.map((pr) => (
          <motion.li key={pr._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} className="bg-white rounded-2xl p-4 shadow-sm border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-medium text-gray-900">{pr.title}</div>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{pr.type ?? "PR"}</div>
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  by <span className="font-medium text-gray-700">{pr.author?.Username ?? pr.author}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(pr.createdAt).toLocaleString()}</span>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  Target note: <span className="font-medium">{pr.targetNote?.title ?? pr.target?.note}</span>
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <Button onClick={() => navigate(`/prs/${pr._id}/merge`)}>Merge</Button>
                  <Button onClick={() => ignorePR(pr._id)} variant="danger">Ignore</Button>
                </div>
                <Link to={`/prs/${pr._id}`} className="text-sm text-indigo-600 hover:underline">View</Link>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
