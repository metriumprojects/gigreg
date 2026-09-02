import multer from "multer";
import path from "path";

const storage = multer.diskStorage({});

const fileFilter = (req, file, cb) => {
 
  const ext = path.extname(file.originalname);
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase())) {
    return cb(new Error("Only images are allowed"), false);
  }
  cb(null, true);
};

export const upload = multer({ storage, fileFilter });
