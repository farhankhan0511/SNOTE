// Server/Model/PullRequest.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const PRSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // snapshot of the source (fork) at PR creation
  source: {
    note: { type: Schema.Types.ObjectId, ref: "Note", required: true },
    content: { type: String, required: true } // full snapshot text or serialized editor JSON
  },

  // snapshot of the target note at PR creation (base)
  target: {
    note: { type: Schema.Types.ObjectId, ref: "Note", required: true },
    baseContent: { type: String, required: true } // content of target when PR created
  },

  status: { type: String, enum: ["open", "merged", "closed"], default: "open" },

  reviewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  comments: [
    {
      author: { type: Schema.Types.ObjectId, ref: "User" },
      text: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],

  // stores conflict hunks when merge attempt finds conflicts
  mergeConflicts: { type: Schema.Types.Mixed, default: null },

  createdAt: { type: Date, default: Date.now },
  mergedAt: Date,
});

export default mongoose.model("PullRequest", PRSchema);
