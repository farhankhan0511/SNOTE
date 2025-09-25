import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import FileHandler from "@tiptap/extension-file-handler";
import Highlight from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Extension } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import NoteEditor from "@/components/notes/NoteEditor.jsx";
import { useNote, useUpdateNote } from "@/queries/NoteQueries";
import axiosInstance from "@/utils/axios";

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

const NoteEditorPage = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { data: note } = useNote(noteId);
  const [selectedNote, setSelectedNote] = useState(note);

  const updateNoteMutation = useUpdateNote();
  

  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (noteId) {
      setSelectedNote(note);
    } else {
      // Note not found, redirect back to notes list
      toast.error("Note not found");
      navigate("/notes");
    }
  }, [noteId, note, navigate]);

  const BackspaceOnImage = Extension.create({
    addKeyboardShortcuts() {
      return {
        Backspace: ({ editor }) => {
          const { state } = editor;
          const { $from, empty } = state.selection;
          if (!empty) {
            return false;
          }

          let imageNode = null;
          let imagePos = null;

          if ($from.nodeBefore && $from.nodeBefore.type.name === "image") {
            imageNode = $from.nodeBefore;
            imagePos = $from.pos - $from.nodeBefore.nodeSize;
          } else if ($from.parentOffset === 0) {
            const prevNode = state.doc.resolve($from.pos - 1);
            if (
              prevNode.nodeBefore &&
              prevNode.nodeBefore.type.name === "image"
            ) {
              imageNode = prevNode.nodeBefore;
              imagePos = prevNode.pos - prevNode.nodeBefore.nodeSize;
            }
          } else {
            for (let pos = $from.pos - 1; pos >= 0; pos--) {
              try {
                const resolvedPos = state.doc.resolve(pos);
                const node = resolvedPos.nodeAfter;
                if (node && node.type.name === "image") {
                  imageNode = node;
                  imagePos = pos;
                  break;
                }

                if (node && node.type.name !== "text") {
                  break;
                }
              } catch (e) {
                break;
              }
            }
          }

          if (imageNode) {
            mySpecialImageHandler(imageNode, imagePos, editor);
            return true;
          }

          return false;
        },
      };
    },
  });

  async function mySpecialImageHandler(node, pos, editor) {
    try {
      const src = node.attrs.src;
      if (!src) {
        console.error("No src attribute found on image");
        return;
      }

      const publicId = src.split("/").pop().split(".")[0];

      await axiosInstance.post("/note/deleteimage", { publicId });
      if (pos !== null && pos >= 0) {
        const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
        editor.view.dispatch(tr);
      }
    } catch (err) {
      console.error("Image deletion failed:", err);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}`;
          }
          return 'Type "/" for commands, or just start writing...';
        },
      }),
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        allowBase64: true,
      }),
      BackspaceOnImage,
      FileHandler.configure({
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
        ],
        onDrop: (currentEditor, files, pos) =>
          handleImageUpload(currentEditor, files, pos),
        onPaste: (currentEditor, files, pos) =>
          handleImageUpload(currentEditor, files, pos),
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: selectedNote?.content || "",
    onUpdate: ({ editor }) => {
      if (!selectedNote) return;

      const content = editor.getHTML();

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateNote(selectedNote._id, { content });
      }, 1500); // waits 1500ms after last keystroke
    },
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none",
      },
    },
    shouldRerenderOnTransaction: true,
  });

  const handleImageUpload = async (editor, files, pos) => {
    const replacePlaceholder = (placeholder, replacement) => {
      const { doc } = editor.state;
      let replaced = false;

      doc.descendants((node, posNode) => {
        if (replaced) return false;
        if (node.isText && node.text && node.text.includes(placeholder)) {
          const idx = node.text.indexOf(placeholder);
          const from = posNode + idx;
          const to = from + placeholder.length;

          editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContentAt({ from, to: from }, replacement)
            .run();

          replaced = true;
          return false;
        }
        return true;
      });

      return replaced;
    };

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const safePos =
        typeof pos === "number" ? pos : editor.state.selection.from;
      const uploadId =
        "Uploading-Image" +
        Date.now() +
        "-" +
        Math.random().toString(6).slice(2, 6);
      const placeholder = `[${uploadId}]`;

      editor
        .chain()
        .focus()
        .insertContentAt({ from: safePos, to: safePos }, placeholder)
        .run();

      try {
        const formData = new FormData();
        formData.append("noteImage", file);

        const { data } = await axiosInstance.post("/note/upload", formData);
        const imageUrl = data.noteImageUrl;

        const didReplace = replacePlaceholder(placeholder, {
          type: "image",
          attrs: { src: imageUrl, alt: file.name || "Image" },
        });

        if (!didReplace) {
          const insertPos = editor.state.selection.from;
          editor
            .chain()
            .focus()
            .insertContentAt(
              { from: insertPos, to: insertPos },
              {
                type: "image",
                attrs: { src: imageUrl, alt: file.name || "Image" },
              }
            )
            .run();
        }
      } catch {
        const didReplace = replacePlaceholder(
          placeholder,
          "Failed to upload image"
        );
        if (!didReplace) {
          editor
            .chain()
            .focus()
            .insertContentAt(
              editor.state.selection.from,
              "Failed to upload image"
            )
            .run();
        }
      }
    }
  };

  useEffect(() => {
    if (editor && selectedNote) {
      const currentContent = editor.getHTML();
      if (currentContent !== selectedNote.content) {
        editor.commands.setContent(selectedNote.content);
      }
    }
  }, [selectedNote, editor]);

  const updateNote = (id, updates) => {
    updateNoteMutation.mutate({ id, ...updates });
    if (selectedNote && selectedNote._id === id) {
      setSelectedNote({ ...selectedNote, ...updates });
    }
  };

  const insertImage = () => {
    if (!editor) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.addEventListener("change", async () => {
      const files = input?.files;
      if (!files || files.length === 0) return;

      try {
        await handleImageUpload(editor, files, editor.state.selection.from);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    });

    input.click();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url && editor) {
      if (editor.state.selection.empty) {
        const text = prompt("Enter link text:") || url;
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url}">${text}</a>`)
          .run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
  };

  const insertTable = () => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    }
  };

  const handleClose = () => {
    navigate("/notes");
  };

  if (!selectedNote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading note...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--txt)" }}
    >
      <div className="h-screen flex flex-col">
        <NoteEditor
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          colors={colors}
          editor={editor}
          updateNote={updateNote}
          insertLink={insertLink}
          insertImage={insertImage}
          insertTable={insertTable}
          onClose={handleClose}
          isFullScreen={true}
        />
      </div>
    </div>
  );
};

export default NoteEditorPage;