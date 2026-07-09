import fs from 'fs';
import multer from 'multer';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads', 'document');

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

function sanitizeFile(file: Express.Multer.File): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

  const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPG, PNG, PDF, DOC, and DOCX are allowed.');
  }

  if (!allowedExts.includes(ext)) {
    throw new Error('Invalid file extension. Only .pdf, .doc, .docx, .jpg, .jpeg, and .png are allowed.');
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error('File size must not exceed 2MB.');
  }

  return true;
}

export const portfolioUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/document/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    try {
      sanitizeFile(file);
      cb(null, true);
    } catch (err) {
      cb(err as Error);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});
