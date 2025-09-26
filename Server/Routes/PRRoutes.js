// Server/Routes/PRRoutes.js
import express from "express";
import { closePR, createPR, getPendingPRs, getPRDetails, mergePR, resolveMerge } from "../Controller/PRController.js";
import authMiddleware from "../Middlewares/authMiddleware.js"; // adapt as your auth

const router = express.Router();

router.post("/", authMiddleware, createPR);               // create PR
router.post("/:prId/merge", authMiddleware, mergePR);     // attempt merge
router.post("/:prId/resolve", authMiddleware, resolveMerge);
router.get("/", authMiddleware, getPendingPRs);           // GET /api/prs?status=open  -> pending PRs (for current user)
router.get("/:prId", authMiddleware, getPRDetails);      // GET details of a PR
router.post("/:prId/close", authMiddleware, closePR);    // close/ignore PR

// add GET /:prId, GET /?noteId=... listing, POST /:prId/close etc.

export default router;
