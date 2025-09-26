import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import NoteHeader from "@/components/notes/NoteHeader.jsx";
import NotesList from "@/components/notes/NotesList.jsx";
import TrashNotes from "@/components/notes/TrashNote";

import {
  useArchivedNotes,
  useArchiveNote,
  useCreateNote,
  useDeleteNote,
  useRestoreTrashedNote,
  useTrashedNotes,
  useTrashNote,
  useUpdateNote,
  useUserNotes,
} from "@/queries/NoteQueries";

import "@/components/notes/note.css";
import { uploadNoteFile } from "@/api/NoteApi";

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

const MyNoteListPage = () => {
  const navigate = useNavigate();
  const { data: notes = [], isLoading } = useUserNotes();
  const { data: archiveNotes = [], isLoading: isArchiveLoading } = useArchivedNotes();
  const { data: trashNotes = [], isLoading: isTrashLoading } = useTrashedNotes();

  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const archiveNoteMutation = useArchiveNote();
  const sendToTrashMutation = useTrashNote();
  const restoreMutation = useRestoreTrashedNote();

  const [status, setStatus] = useState("active"); // active, archive, trash
  const [searchTerm, setSearchTerm] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(null);

  // upload state + ref
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const notesObj = {
    active: notes,
    archive: archiveNotes,
    trash: trashNotes,
  };

  // create note (existing behavior)
  const createNewNote = () => {
    createNoteMutation.mutate(
      {
        title: `Note ${notes.length + 1}`,
        content: "Write here...",
        color: "default",
        pinnedAt: false,
      },
      {
        onSuccess: (newNote) => {
          navigate(`/mynotes/${newNote._id}`);
        },
      }
    );
  };

  const updateNote = (id, updates) => {
    updateNoteMutation.mutate({ id, ...updates });
  };

  const deleteNote = (id) => {
    deleteNoteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Note deleted!");
      },
    });
  };

  const sendToTrashNote = (id) => {
    sendToTrashMutation.mutate(id);
  };

  const restoreNote = (id) => {
    restoreMutation.mutate(id, {
      onSuccess: () => toast.success("Note restored"),
    });
  };

  const togglePin = (id, pinnedAt) => {
    updateNote(id, { pinnedAt: !pinnedAt });
  };

  const changeColor = (id, color) => {
    updateNote(id, { color });
    setShowColorPicker(null);
  };


  const archiveNote = (note) => {
    archiveNoteMutation.mutate(note._id);
  };

  const exportNote = (note) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = note.content;
    const textContent = tempDiv.textContent || tempDiv.innerText || "";
    const content = `# ${note.title}\n\n${textContent}`;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPlainTextPreview = (htmlContent) => {
    if (!htmlContent) return "";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    return text.substring(0, 100) + (text.length > 100 ? "..." : "");
  };

  const handleNoteSelect = (note) => {
    navigate(`/mynotes/${note._id}`);
  };

  const filteredNotes = (notesObj[status] || []).filter((note) => {
    const plainContent = getPlainTextPreview(note.content);
    const matchesSearch =
      (note.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      plainContent.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const pinnedNotes = (notesObj[status] || []).filter((note) => note.pinnedAt);
  const unpinnedNotes = (notesObj[status] || []).filter((note) => !note.pinnedAt);

  // =======================
  // Upload handler (called when user picks a file)
  // =======================
  const handleFileChange = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const allowed = [".pdf", ".doc", ".docx"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowed.includes(`.${ext}`)) {
      toast.error("Unsupported file type. Use PDF or Word documents.");
      event.target.value = "";
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File too large. Max 10MB allowed.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("docfile", file); // backend expects 'docfile'

      // Use Authorization header from localStorage if present (adjust to your auth)
      const data = await uploadNoteFile(form);

     
      const createdNote = data?.data.note || data?.data.data || data; // adapt to your response shape
      if (!createdNote || !createdNote._id) {
        toast.success("File processed. Refresh notes to see it.");
      } else {
        toast.success("File uploaded and note created!");
        navigate(`/mynotes/${createdNote._id}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      // reset input so same file can be selected again if needed
      event.target.value = "";
    }
  };

  if (status === "active" && isLoading) {
    return <p>Loading notes...</p>;
  }

  if (status === "archive" && isArchiveLoading) {
    return <p>Loading archived notes...</p>;
  }

  if (status === "trash" && isTrashLoading) {
    return <p>Loading trashed notes...</p>;
  }

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--txt)" }}
    >
      <div className="max-w-7xl mx-auto p-4">
        <NoteHeader
          selectedNote={null}
          createNewNote={createNewNote}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setStatus={setStatus}
          setSelectedNote={() => {}}
          status={status}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          uploading={uploading}
        />

        {(status === "active" || status === "archive") && (
          <NotesList
            pinnedNotes={pinnedNotes}
            unpinnedNotes={unpinnedNotes}
            filteredNotes={filteredNotes}
            searchTerm={searchTerm}
            setSelectedNote={handleNoteSelect}
            togglePin={togglePin}
        
            sendToTrashNote={sendToTrashNote}
            archiveNote={archiveNote}
            exportNote={exportNote}
            changeColor={changeColor}
            showColorPicker={showColorPicker}
            setShowColorPicker={setShowColorPicker}
            colors={colors}
            getPlainTextPreview={getPlainTextPreview}
          />
        )}

        {status === "trash" && (
          <TrashNotes
            notes={trashNotes}
            onDelete={deleteNote}
            onRestore={restoreNote}
            getPlainTextPreview={getPlainTextPreview}
          />
        )}
      </div>
    </div>
  );
};

export default MyNoteListPage;
