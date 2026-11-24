import sharp from "sharp";
import fs from "fs";
import path from "path";

const safeUnlink = (filePath) => {
  if (filePath) {
    fs.promises.unlink(filePath).catch(() => {});
  }
};

export const compressImages = async (req, res, next) => {
  const compressedFiles = [];
  const rawFiles = Array.isArray(req.files)
    ? req.files
    : req.files && typeof req.files === "object"
    ? Object.values(req.files).flat()
    : [];
  try {
    if (rawFiles.length === 0) {
      req.files = [];
      return next();
    }

    for (const file of rawFiles) {
      const compressedPath = path.join(
        path.dirname(file.path),
        `compressed-${Date.now()}-${path.parse(file.filename).name}.webp`
      );

      await sharp(file.path)
        .resize({
          width: 1200,
          withoutEnlargement: true,
        })
        .webp({ quality: 70 })
        .toFile(compressedPath);

      // Remove original uncompressed temp file to prevent disk leak
      safeUnlink(file.path);

      compressedFiles.push({
        ...file,
        path: compressedPath,
        mimetype: "image/webp",
        filename: path.basename(compressedPath),
      });
    }

    req.files = compressedFiles;
    next();
  } catch (error) {
    // Clean up both original and any already-compressed temp files on failure
    for (const file of rawFiles) safeUnlink(file?.path);
    for (const file of compressedFiles) safeUnlink(file?.path);

    console.error("Image compression error:", error.message);
    return res.status(400).json({
      status: false,
      message: "Invalid or corrupted image file",
    });
  }
};
