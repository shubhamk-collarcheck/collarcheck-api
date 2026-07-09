import path from "path";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const s3 = new S3Client({
	credentials: {
		accessKeyId: process.env.AWS_KEY!,
		secretAccessKey: process.env.AWS_SECRET!
	},
	region: process.env.AWS_REGION!
});

const ALLOWED_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"];
const ALLOWED_MIMES = [
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/jpg",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const s3Storage = multerS3({
	s3,
	bucket: process.env.AWS_BUCKET!,
	contentType: multerS3.AUTO_CONTENT_TYPE,

	contentDisposition: (req, file, cb) => {
		cb(null, `attachment; filename="${encodeURIComponent(file.originalname)}"`);
	},

	metadata: (req, file, cb) => {
		cb(null, { fieldname: file.fieldname });
	},

	key: (req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		cb(null, `uploads/documentTemp/${randomUUID()}${ext}`);
	}
});

function sanitizeFile(file: Express.Multer.File, cb: multer.FileFilterCallback) {
	const ext = path.extname(file.originalname.toLowerCase());
	const isAllowedExt = ALLOWED_EXTS.includes(ext);
	const isAllowedMime = ALLOWED_MIMES.includes(file.mimetype);

	if (isAllowedExt && isAllowedMime) {
		return cb(null, true);
	}
	cb(new Error("File type not allowed! Only PDF, PNG, JPG, JPEG, DOC, and DOCX files are accepted."));
}

export const educationUpload = multer({
	storage: s3Storage,
	fileFilter: (req, file, cb) => sanitizeFile(file, cb),
	limits: {
		fileSize: 1024 * 1024 * 2, // 2MB
		files: 5
	}
})
