import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getPRApi } from "../api/NoteApi";

const Button = ({ children, onClick, variant = "primary", ...props }) => {
  const base =
    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
  const styles = {
    primary: base + " bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    ghost: base + " bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
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

export default function PRViewPage() {
  const { prId } = useParams();
  const navigate = useNavigate();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getPRApi(prId);
        if (mounted) setPr(data);
      } catch (err) {
        console.error("Failed to load PR", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [prId]);

  if (loading) return <Loader label="Loading PR…" />;
  if (!pr) return <div className="p-8 text-center text-gray-600">PR not found</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{pr.title}</h1>
          <div className="mt-1 text-sm text-gray-500">By {pr.author?.Username ?? pr.author}</div>
        </div>

        <div className="flex-shrink-0 flex flex-col gap-2">
          <Button onClick={() => navigate(`/prs/${prId}/merge`)}>Open Merge UI</Button>
          <Link to={`/prs/${prId}`} className="text-xs text-gray-400 hover:underline">View raw</Link>
        </div>
      </div>

      <div className="mt-6 text-gray-700 whitespace-pre-wrap">{pr.description}</div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-100">
        <div className="text-sm text-gray-500">Target note</div>
        <div className="mt-1 font-medium text-gray-800">{pr.target?.note}</div>
      </div>
    </motion.div>
  );
}
