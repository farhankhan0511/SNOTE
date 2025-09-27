// Server/Controller/PRController.js
import Note from "../Model/NoteModel.js";
import Fork from "../Model/Fork.js";
import PR from "../Model/PullRequest.js";
import { threeWayMerge } from "../utils/merge3way.js";
import { ApiResponse } from "../utils/ApiResponse.js"; // existing helper in your codebase

// Fork note: POST /api/notes/:id/fork
export const forkNote = async (req, res) => {
  try {
    const originalId = req.params.noteId;
    const userId = req.user._id;

    const origNote = await Note.findById(originalId);
    if (!origNote) return res.status(404).json(new ApiResponse(404, {}, "Original note not found"));

    // create independent copy as fork
    const forkNote = await Note.create({
      title: `${origNote.title} (fork)`,
      content: origNote.content || "",
      color: origNote.color,
      visibility: origNote.visibility === "public" ? "private" : origNote.visibility, // forks default private
      owner: userId,
      pinnedAt: null,
      status: "active",
      forkedFrom: origNote._id,
      collaborators: [],
    });

    await Fork.create({ originalNote: origNote._id, forkNote: forkNote._id, forkedBy: userId });

    // optional: add fork id to origNote.forks array for quick lookup
    origNote.forks = origNote.forks || [];
    origNote.forks.push(forkNote._id);
    await origNote.save();

    return res.status(201).json(new ApiResponse(201, { forkNote }, "Fork created"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

/**
 * createPR - POST /api/prs
 * body: { title, description, sourceNoteId, sourceContent, targetNoteId }
 */
export const createPR = async (req, res) => {
  try {
    const { title, description, sourceNoteId, sourceContent, targetNoteId } = req.body;
    const userId = req.user._id;

    const sourceNote = await Note.findById(sourceNoteId);
    const targetNote = await Note.findById(targetNoteId);
    if (!sourceNote || !targetNote) return res.status(404).json(new ApiResponse(404, {}, "Source or target note not found"));

    const baseContent = targetNote.content ?? "";
    const sourceSnapshot = sourceContent ?? sourceNote.content ?? "";

    const pr = await PR.create({
      title,
      description,
      author: userId,
      source: { note: sourceNote._id, content: sourceSnapshot },
      target: { note: targetNote._id, baseContent },
      status: "open"
    });

    return res.status(201).json(new ApiResponse(201, pr, "Pull Request created"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

/**
 * mergePR - POST /api/prs/:prId/merge
 * attempts auto-merge; returns 409 if conflicts
 */
export const mergePR = async (req, res) => {
  try {
    const prId = req.params.prId;
    const userId = req.user._id;

    const pr = await PR.findById(prId);
    if (!pr) return res.status(404).json(new ApiResponse(404, {}, "PR not found"));
    if (pr.status !== "open") return res.status(400).json(new ApiResponse(400, {}, "PR is not open"));

    const targetNote = await Note.findById(pr.target.note);
    if (!targetNote) return res.status(404).json(new ApiResponse(404, {}, "Target note not found"));

    // permission check: only owner or editor
    const isOwner = String(targetNote.owner) === String(userId);
    const isEditor = (targetNote.collaborators || []).some(c => String(c.user) === String(userId) && c.access === "edit");
    if (!isOwner && !isEditor) return res.status(403).json(new ApiResponse(403, {}, "Not authorized to merge into target"));

    const base = pr.target.baseContent ?? "";
    const source = pr.source.content ?? "";
    const currentTarget = targetNote.content ?? "";

    const { mergedText, conflict, conflicts } = threeWayMerge(base, currentTarget, source);

    if (conflict) {
      pr.mergeConflicts = conflicts;
      await pr.save();
      return res.status(409).json(new ApiResponse(409, { conflicts }, "Merge conflicts detected"));
    }

    // no conflicts -> update target note
    targetNote.content = mergedText;
    await targetNote.save();

    pr.status = "merged";
    pr.mergedAt = new Date();
    pr.mergeConflicts = null;
    await pr.save();

    return res.status(200).json(new ApiResponse(200, { pr, mergedContent: mergedText }, "PR merged successfully"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

/**
 * resolveMerge - POST /api/prs/:prId/resolve
 * body: { resolvedContent }
 */
export const resolveMerge = async (req, res) => {
  try {
    const prId = req.params.prId;
    const { resolvedContent } = req.body;
    const userId = req.user._id;

    const pr = await PR.findById(prId);
    if (!pr) return res.status(404).json(new ApiResponse(404, {}, "PR not found"));
    if (typeof resolvedContent !== "string" || resolvedContent.trim() === "") {
  return res.status(400).json(new ApiResponse(400, {}, "Resolved content must be a non-empty string"));
}
    if (pr.status !== "open") return res.status(400).json(new ApiResponse(400, {}, "PR is not open"));      

    const targetNote = await Note.findById(pr.target.note);
    if (!targetNote) return res.status(404).json(new ApiResponse(404, {}, "Target note not found"));

    const isOwner = String(targetNote.owner) === String(userId);
    const isEditor = (targetNote.collaborators || []).some(c => String(c.user) === String(userId) && c.access === "edit");
    if (!isOwner && !isEditor) return res.status(403).json(new ApiResponse(403, {}, "Not authorized"));

    targetNote.content = resolvedContent;
    await targetNote.save();

    pr.status = "merged";
    pr.mergedAt = new Date();
    pr.mergeConflicts = null;
    await pr.save();

    return res.status(200).json(new ApiResponse(200, { pr, mergedContent: resolvedContent }, "PR merged after manual resolution"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

/**
 * getPendingPRs - GET /api/prs?status=open
 * returns open PRs where current user is the owner of the target note
 */
export const getPendingPRs = async (req, res) => {
  try {
    const userId = req.user._id;
    const prs = await PR.find({ status: "open" }).populate("author", "Username").lean();

    const results = [];
    for (const pr of prs) {
      const targetNote = await Note.findById(pr.target.note).select("owner title").lean();
      if (targetNote && String(targetNote.owner) === String(userId)) {
        pr.targetNote = targetNote;
        results.push(pr);
      }
    }

    return res.status(200).json(new ApiResponse(200, results, "Pending PRs fetched"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

/**
 * getPRDetails - GET /api/prs/:prId
 * returns PR plus current target content
 */
export const getPRDetails = async (req, res) => {
  try {
    const prId = req.params.prId;
    const pr = await PR.findById(prId).populate("author", "Username").lean();
    if (!pr) return res.status(404).json(new ApiResponse(404, {}, "PR not found"));

    const targetNote = await Note.findById(pr.target.note).lean();
    pr.currentTargetContent = targetNote?.content ?? null;

    return res.status(200).json(new ApiResponse(200, pr, "PR details fetched"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

/**
 * closePR - POST /api/prs/:prId/close
 */
export const closePR = async (req, res) => {
  try {
    const prId = req.params.prId;
    const pr = await PR.findById(prId);
    if (!pr) return res.status(404).json(new ApiResponse(404, {}, "PR not found"));

    const userId = req.user._id;
    const targetNote = await Note.findById(pr.target.note);
    if (!targetNote) return res.status(404).json(new ApiResponse(404, {}, "Target note not found"));

    const isOwner = String(targetNote.owner) === String(userId);
    const isAuthor = String(pr.author) === String(userId);
    if (!isOwner && !isAuthor) return res.status(403).json(new ApiResponse(403, {}, "Not authorized to close PR"));

    pr.status = "closed";
    await pr.save();

    return res.status(200).json(new ApiResponse(200, pr, "PR closed"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};
