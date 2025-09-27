// Frontend/src/pages/NotesListPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { usePublicNotes } from "@/queries/NoteQueries";

import "@/components/notes/note.css";

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

const NotesListPage = () => {
  const navigate = useNavigate();

  // immediate input value
  const [searchTerm, setSearchTerm] = useState("");
  // debounced value we pass to the query hook
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef(null);

  // use the public notes hook with the debounced search term
  const { data: notesData = [], isLoading } = usePublicNotes(debouncedSearch);
  const notes = notesData || [];

  // debounce input -> update debouncedSearch after 350ms idle
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const handleNoteSelect = (note) => {
    navigate(`/view/${note._id}`);
  };

  const getPlainTextPreview = (htmlContent) => {
    if (!htmlContent) return "";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    return text.substring(0, 100) + (text.length > 100 ? "..." : "");
  };

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--txt)" }}
    >
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Discover Notes</h1>
            <div className="text-sm text-gray-500">
              {debouncedSearch ? `Searching for “${debouncedSearch}”` : "Public notes"}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search public notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: "var(--bg-secondary)",
                color: "var(--txt)",
                borderColor: "var(--border)",
              }}
            />

            {/* clear button */}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
                className="text-xs opacity-70"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Loading / Empty state */}
        {isLoading ? (
          <div className="min-h-[200px] flex items-center justify-center">
            <p>Loading public notes…</p>
          </div>
        ) : notes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {notes.map((note) => (
              <div
                key={note._id}
                onClick={() => handleNoteSelect(note)}
                className="p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-all duration-200"
                style={{
                  backgroundColor:
                    colors.find((c) => c.name === note.color)?.style.backgroundColor ||
                    "var(--note-default)",
                  borderColor: "var(--border)",
                }}
              >
                <h3 className="font-semibold text-lg mb-2 truncate">{note.title}</h3>
                <p className="text-sm opacity-80 mb-3 line-clamp-3">
                  {getPlainTextPreview(note.content)}
                </p>
                <div className="flex items-center justify-between text-xs opacity-70">
                  <span>By: {note.owner?.Username || "Anonymous"}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                {note.isCollaborative && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                      Collaborative
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg opacity-70">No public notes found</p>
            <p className="text-sm opacity-50 mt-2">
              {debouncedSearch ? "Try adjusting your search terms" : "Be the first to share a public note!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesListPage;
