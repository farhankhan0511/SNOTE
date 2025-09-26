// Server/Model/NoteVersion.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const NoteVersionSchema = new Schema({
  noteId: {
    // Parent Note ID
    type: Schema.Types.ObjectId,
    ref: "Note",
    required: true,
  },
  modifiedBy: {
    // User who created this version
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  versionNumber: {
    // Simple counter for display (increment as you create versions)
    type: Number,
    required: true,
  },
  // The diff from the PREVIOUS version (JSON Patch or any structured diff)
  diff: {
    type: Object,
    default: null,
  },
  // Full snapshot of content (used for quick restores or when isFullSnapshot=true)
  snapshot: {
    title: { type: String },
    jsonContent: { type: Object },
    content: { type: String },
  },
  // If true, this version stores a full snapshot (not only diff)
  isFullSnapshot: {
    type: Boolean,
    default: false,
  },

  // Parents: array of parent version ids (one for normal commit, two for merges)
  parents: [
    {
      type: Schema.Types.ObjectId,
      ref: "NoteVersion",
    },
  ],

  // Commit/message describing this change
  message: {
    type: String,
    default: "Edit",
  },
},
{ timestamps: true });

export default mongoose.model("NoteVersion", NoteVersionSchema);
