import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import {
 
  createNote,
  
  
  getAllNotes,
  
  getNoteById,
 
} from "../Controller/NotesController.js";

import authMiddleware from "../Middlewares/authMiddleware.js";

// these are added -> for security --
import { sanitizeFields } from "../security/sanitizeMiddleware.js";
import {
  createNoteValidationRules,
  updateNoteValidationRules,
} from "../security/validation.js";
import { validate } from "../security/validationMiddleware.js";
// ------

const router = express.Router();

const uploadDir = "uploads/";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/tiff",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images are allowed."), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

router.post(
  "/",
  authMiddleware,
  createNoteValidationRules(),
  validate,
  sanitizeFields(["title", "content"]),
  createNote
);

// Route to get all notes
router.route("/notes").get(authMiddleware, getAllNotes);
router.get("/:id", authMiddleware, getNoteById);

// router.route("/")

// router.post(
//   "/upload",
//   authMiddleware,
//   upload.single("noteImage"),
//   uploadNoteImage
// );

// router.get("/archive", authMiddleware, getArchivedNotes);
// router.post("/archive/:id", authMiddleware, archiveNote);

// router.get("/trash", authMiddleware, getTrashedNotes);
// router.post("/trash/:id", authMiddleware, moveToTrash);

// router.post("/restore/:id", authMiddleware, restoreNote);


// router.put(
//   "/:id",
//   authMiddleware,
//   updateNoteValidationRules(),
//   validate,
//   sanitizeFields(["title", "content"]),
//   updateNote
// );

// router.delete("/:id", authMiddleware, deleteNote);
// router.post("/deleteimage", authMiddleware, deleteNoteImage);

export default router;
