import sharp from "sharp";
import fs from "fs";
import path from "path";

export const compressImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const compressedFiles = [];

    for (const file of req.files) {

      // 🔥 Output in WEBP (universal compressed)
      const compressedPath = path.join(
        path.dirname(file.path),
        `compressed-${Date.now()}-${path.parse(file.filename).name}.webp`
      );
console.log(file.path, 'pathaaaaa')
      await sharp(file.path)
        .resize({
          width: 1200,            // Reduce dimensions for smaller size
          withoutEnlargement: true,
        })
        .webp({ quality: 70 })    // Convert + compress to WebP
        .toFile(compressedPath);

      // Remove original file
      // if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      // Replace file info with compressed file
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
    console.error("Image compression error:", error);
    return res.status(500).json({
      status: false,
      message: "Image compression failed",
    });
  }
};
