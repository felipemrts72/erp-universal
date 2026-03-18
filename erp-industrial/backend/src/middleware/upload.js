import multer from 'multer';

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || 'uploads',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

export const upload = multer({ storage });
