import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Image as ImgIcn,
  Link as LinkIcn,
  Table as TableIcn,
  X,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNote } from "@/queries/NoteQueries";
import { toast } from "react-toastify";
import { forkNote } from "@/api/NoteApi";

export default function ViewNote() {
  const { noteId } = useParams(); // Fixed: direct destructuring
  const navigate = useNavigate();

  // Hook only returns data
  const { data: note } = useNote(noteId);
  
  const [selectedNote, setSelectedNote] = useState(null);
  

  // Redirect if no noteId in URL
  useEffect(() => {
    if (!noteId) {
      toast.error("Invalid note ID");
      navigate("/discover");
    }
  }, [noteId, navigate]);

  useEffect(() => {
    if (note !== undefined) {
      setSelectedNote(note);
    }
  }, [note]);

  // Handle not found state
  useEffect(() => {
    if (note === null) {
      toast.error("Note not found or access denied");
      const timer = setTimeout(() => navigate("/discover"), 1000);
      return () => clearTimeout(timer);
    }
  }, [note, navigate]);

  const colors = [
    { name: "default", style: { backgroundColor: "var(--note-default)" } },
    { name: "red", style: { backgroundColor: "var(--note-red)" } },
    { name: "orange", style: { backgroundColor: "var(--note-orange)" } },
    { name: "yellow", style: { backgroundColor: "var(--note-yellow)" } },
    { name: "green", style: { backgroundColor: "var(--note-green)" } },
    { name: "blue", style: { backgroundColor: "var(--note-blue)" } },
    { name: "purple", style: { backgroundColor: "var(--note-purple)" } },
    { name: "pink", style: { backgroundColor: "var(--note-pink)" } },
  ];

  const contentHtml = selectedNote?.content ?? `<h1>Untitled Note</h1><p>No content available</p>`;
  const selectedNoteMeta = {
    title: selectedNote?.title ?? "Untitled Note",
    color: selectedNote?.color ?? "default",
    createdAt: selectedNote?.createdAt,
    owner: selectedNote?.owner,
    isPublic: selectedNote?.isPublic,
    isCollaborative: selectedNote?.isCollaborative,
  };

  const bgColor =
    colors.find((c) => c.name === selectedNoteMeta.color)?.style.backgroundColor ||
    "var(--note-default)";

  const copyText = async () => {
    try {
      const tmp = document.createElement("div");
      tmp.innerHTML = contentHtml;
      const text = tmp.innerText || tmp.textContent || "";
      await navigator.clipboard.writeText(text);
      
      // Better toast notification
      toast.success("Note content copied to clipboard", {
        position: "bottom-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.warn("Copy failed:", error);
      toast.error("Failed to copy content");
    }
  };

  const handlePrint = () => {
    // Create a new window for printing with better formatting
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${selectedNoteMeta.title}</title>
            <style>
              body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
              h1, h2, h3 { color: #333; }
              .note-meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="note-meta">
              <h1>${selectedNoteMeta.title}</h1>
              <p>By: ${selectedNoteMeta.owner?.Username || "Anonymous"} • ${selectedNoteMeta.createdAt ? new Date(selectedNoteMeta.createdAt).toLocaleDateString() : ""}</p>
            </div>
            ${contentHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Determine loading state based on note data
  const isLoading = note === undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
          </div>
          <p className="mt-4 text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  if (note === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Note not found or access denied</p>
          <Button onClick={() => navigate("/")} className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Discover
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex-1 flex flex-col rounded-tl-3xl min-h-screen"
      style={{ backgroundColor: bgColor, color: "var(--txt)" }}
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.12 }}
    >
      {/* Header */}
      <div className="p-4 pb-0 flex flex-col gap-3" style={{ borderColor: "var(--bg-sec)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-sm font-medium">
              {selectedNoteMeta.owner?.Username?.charAt(0).toUpperCase() || "A"}
            </div>
            <div>
              <div className="text-lg font-semibold" style={{ color: "var(--txt)" }}>
                {selectedNoteMeta.title}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <span>{selectedNoteMeta.owner?.Username || "Anonymous"}</span>
                <span>•</span>
                <span>{selectedNoteMeta.createdAt ? new Date(selectedNoteMeta.createdAt).toLocaleDateString() : ""}</span>
                {selectedNoteMeta.isCollaborative && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                      Collaborative
                    </span>
                  </>
                )}
                {selectedNoteMeta.isPublic && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                      Public
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => forkNote(noteId).then((newNote) => {
                console.log("Forked note:", newNote);
                toast.success("Note forked successfully");
                navigate(`/mynotes/${newNote.forkNote._id}`);
              }).catch((err) => {
                console.error("Fork failed:", err);
                toast.error("Failed to fork note");
              })}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" role="img" aria-labelledby="forkTitle forkDesc">
                <title id="forkTitle">Fork (branch)</title>
                <desc id="forkDesc">Three nodes connected with lines representing a git fork/branch.</desc>
                <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                
                    <circle cx="6" cy="6" r="2.2"/>
                
                    <circle cx="6" cy="18" r="2.2"/>
                
                    <circle cx="18" cy="12" r="2.2"/>
                
                    <path d="M8 8.2V15.8" />
                    
                    <path d="M10.5 12H15.2" />
                </g>
                </svg>

              Fork
            </Button>
            <Button
              onClick={() => navigate("/notes")}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Toolbar (visual only) */}
        <div className="flex items-center gap-2 flex-wrap p-1.5 rounded-lg bg-black/5">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 cursor-not-allowed" aria-label="Heading 1 format (read-only)">
              <Heading1 size={14}/> H1
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 cursor-not-allowed" aria-label="Heading 2 format (read-only)">
              <Heading2 size={14}/> H2
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 cursor-not-allowed" aria-label="Heading 3 format (read-only)">
              <Heading3 size={14}/> H3
            </span>
          </div>

          <div className="w-px h-5 mx-1 bg-gray-400" />

          <div className="flex items-center gap-1 text-sm text-gray-500">
            {[
              { icon: Bold, label: "Bold" },
              { icon: Italic, label: "Italic" },
              { icon: List, label: "Bullet List" },
              { icon: ListOrdered, label: "Numbered List" },
              { icon: Quote, label: "Quote" },
              { icon: LinkIcn, label: "Link" },
              { icon: ImgIcn, label: "Image" },
              { icon: TableIcn, label: "Table" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="px-2 py-1 rounded bg-white/10 cursor-not-allowed"
                aria-label={`${label} format (read-only)`}
                title={`${label} - Read only view`}
              >
                <Icon size={14} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Document Content */}
      <main className="flex-1 p-4 overflow-auto">
        <div className="mx-auto  rounded-lg shadow-sm" style={{ maxWidth: 900 }}>
          <article
            className="prose prose-lg max-w-none p-8 pb-16"
            role="document"
            aria-readonly="true"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>
      </main>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t bg-white/10">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span>Read-only viewer</span>
          {selectedNoteMeta.isPublic && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              Public Note
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            Print
          </Button>
          <Button
            onClick={copyText}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            Copy Text
          </Button>
        </div>
      </div>
    </motion.div>
  );
}