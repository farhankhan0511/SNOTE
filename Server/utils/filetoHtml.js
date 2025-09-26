// utils/fileToHtml.js
// Converts DOCX/PDF buffers to HTML, uploads embedded images to Cloudinary,
// and embeds <img src="CLOUDINARY_URL"> tags in the HTML. No OCR, no AI.

import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import sanitizeHtml from "sanitize-html";
import cloudinary from "cloudinary";

// PDF.js dynamic import helper
async function importPdfJs() {
  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (e) {
    return await import("pdfjs-dist/legacy/build/pdf");
  }
}

// configure cloudinary (ensure these env vars are set)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Upload a Buffer to Cloudinary, return secure_url */
async function uploadBufferToCloudinary(buffer, filename = "upload") {
  if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("Invalid buffer");

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder: "snote_uploads",
        resource_type: "image",
        public_id: `${path.parse(filename).name}-${Date.now()}`,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result?.secure_url || result?.url);
      }
    );
    uploadStream.end(buffer);
  });
}

// Helper: extract text from a PDF buffer using pdfjs-dist
async function extractTextFromPdfWithPdfjs(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("Invalid buffer for PDF extraction");

  const pdfjsLib = await importPdfJs();
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;

  let fullText = "";
  try {
    const numPages = pdfDoc.numPages || 0;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items || []).map((it) => it.str).join(" ");
      fullText += pageText + "\n\n";
      if (typeof page.cleanup === "function") {
        try { page.cleanup(); } catch {}
      }
    }
  } finally {
    try { if (typeof pdfDoc.destroy === "function") await pdfDoc.destroy(); } catch {}
  }
  return fullText.trim();
}

/**
 * Best-effort extraction of embedded images from PDF using pdf-lib internals.
 * Returns array of { filename, buffer }.
 *
 * Note: PDF image extraction is inherently best-effort. For guaranteed page images,
 * rendering pages to images with pdfjs + canvas is required (extra native deps).
 */
async function extractImagesFromPdfBuffer(buffer) {
  const images = [];
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();
    const context = pdfDoc.context;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      try {
        const resources = page.node.Resources?.();
        const xObject = resources?.get?.("XObject") || resources?.get?.("XObject");
        if (xObject && xObject.dict) {
          const entries = Object.entries(xObject.dict);
          for (const [name, ref] of entries) {
            try {
              const xObjectObj = context.lookup(ref);
              if (!xObjectObj) continue;
              const subtype = xObjectObj.get?.("Subtype");
              const isImage =
                (subtype && subtype.name && subtype.name === "Image") ||
                (subtype && subtype.toString && subtype.toString().includes("Image"));

              if (isImage) {
                // try to read raw stream contents (array of Uint8Array)
                let raw = null;
                if (xObjectObj.contents && xObjectObj.contents.length) {
                  raw = Buffer.concat(xObjectObj.contents.map((c) => Buffer.from(c)));
                } else {
                  const possible = xObjectObj.get?.("Contents") || xObjectObj.get?.("Data");
                  if (possible && possible.value) raw = Buffer.from(possible.value);
                }
                if (raw && raw.length > 0) {
                  images.push({ filename: `page-${i + 1}-${name}.png`, buffer: raw });
                }
              }
            } catch (e) {
              // ignore single image extraction errors
            }
          }
        }
      } catch (e) {
        // ignore per-page errors
      }
    }
  } catch (e) {
    console.warn("PDF image extraction failed (pdf-lib):", e?.message || e);
  }
  return images;
}

/* ---------- DOCX: convert images inline by uploading to Cloudinary ---------- */
async function convertDocxBufferToHtmlWithCloudinary(buffer) {
  // mammoth convertImage handler: reads image bytes and uploads to Cloudinary
  const convertImage = mammoth.images.inline(async (element) => {
    const base64Str = await element.read("base64");
    const contentType = element.contentType || "image/png";
    const ext = (contentType.split("/")[1] || "png").split(";")[0];
    const imageBuffer = Buffer.from(base64Str, "base64");
    const url = await uploadBufferToCloudinary(imageBuffer, `docx-image.${ext}`);
    const alt = element.altText || "";
    return { src: url, alt };
  });

  const result = await mammoth.convertToHtml({ buffer, convertImage });

  // sanitize but allow <img>
  const safeHtml = sanitizeHtml(result.value || "", {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height"],
    },
  });

  // Defensive: replace any remaining data: URLs by uploading them (rare)
  if (safeHtml.includes('src="data:') || safeHtml.includes("src='data:")) {
    const dataUrlRegex = /<img[^>]+src=(["'])(data:[^"']+)\1[^>]*>/gi;
    let match;
    let updatedHtml = safeHtml;
    const replacements = [];
    while ((match = dataUrlRegex.exec(safeHtml)) !== null) {
      const dataUrl = match[2];
      try {
        const commaIdx = dataUrl.indexOf(",");
        const b64 = dataUrl.substring(commaIdx + 1);
        const meta = dataUrl.substring(5, commaIdx); // e.g. image/png;base64
        const ext = (meta.split(";")[0].split("/")[1] || "png");
        const imgBuf = Buffer.from(b64, "base64");
        const url = await uploadBufferToCloudinary(imgBuf, `docx-embedded.${ext}`);
        replacements.push({ dataUrl, url });
      } catch (e) {
        console.warn("Failed to upload embedded data URL from docx:", e?.message || e);
      }
    }
    for (const r of replacements) updatedHtml = updatedHtml.split(r.dataUrl).join(r.url);
    return updatedHtml;
  }

  return safeHtml;
}

/* ---------- Main exported function ---------- */

export async function fileToHtmlFromBuffer({ buffer, filename = "file" }) {
  if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("No valid file buffer provided");

  const ext = (filename.split(".").pop() || "").toLowerCase();

  // DOCX
  if (ext === "docx") {
    const html = await convertDocxBufferToHtmlWithCloudinary(buffer);
    return html;
  }

  // PDF
  if (ext === "pdf") {
    // 1) extract text
    let text = "";
    try {
      text = await extractTextFromPdfWithPdfjs(buffer);
    } catch (e) {
      console.warn("PDF text extraction failed:", e?.message || e);
      text = "";
    }

    // 2) extract images (best-effort)
    let extractedImages = [];
    try {
      extractedImages = await extractImagesFromPdfBuffer(buffer);
    } catch (e) {
      console.warn("PDF image extraction failed:", e?.message || e);
      extractedImages = [];
    }

    // 3) upload to Cloudinary
    const uploadedUrls = [];
    for (const img of extractedImages) {
      try {
        const url = await uploadBufferToCloudinary(img.buffer, img.filename || `pdf-image-${Date.now()}.png`);
        uploadedUrls.push(url);
      } catch (e) {
        console.warn("Failed to upload extracted PDF image:", e?.message || e);
      }
    }

    // 4) build HTML: paragraphs + appended images as figures
    const paragraphsHtml = (text || "")
      .split(/\n{2,}/)
      .map((p) => `<p>${sanitizeHtml(p.trim())}</p>`)
      .join("\n");

    const imgsHtml = uploadedUrls
      .map((u) => `<figure class="embedded-image"><img src="${u}" alt="embedded-image" /></figure>`)
      .join("\n");

    const combinedHtml = `${paragraphsHtml}\n<div class="embedded-images">${imgsHtml}</div>`;

    const safeHtml = sanitizeHtml(combinedHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt", "width", "height"],
        figure: ["class"],
      },
    });

    return safeHtml;
  }

  // fallback: plain text
  const plain = buffer.toString("utf8");
  return `<pre>${sanitizeHtml(plain)}</pre>`;
}
