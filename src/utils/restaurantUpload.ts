import path from "path";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const s3 = new S3Client({
	credentials: {
		accessKeyId: process.env.AWS_KEY!,
		secretAccessKey: process.env.AWS_SECRET!,
	},
	region: process.env.AWS_REGION!,
});

const ALLOWED_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"];
const ALLOWED_MIMES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/webp",
	"application/pdf",
];

const s3Storage = multerS3({
	s3,
	bucket: process.env.AWS_BUCKET!,
	contentType: multerS3.AUTO_CONTENT_TYPE,
	metadata: (_req, file, cb) => {
		cb(null, { fieldname: file.fieldname });
	},
	key: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		cb(null, `uploads/restaurant/${randomUUID()}${ext}`);
	},
});

function sanitizeFile(file: Express.Multer.File, cb: multer.FileFilterCallback) {
	const ext = path.extname(file.originalname.toLowerCase());
	const isAllowedExt = ALLOWED_EXTS.includes(ext);
	const isAllowedMime = ALLOWED_MIMES.includes(file.mimetype);

	if (isAllowedExt && isAllowedMime) {
		return cb(null, true);
	}
	cb(new Error("File type not allowed! Only image and PDF files are accepted."));
}

/** Multipart upload for restaurant profile / banner images. */
export const restaurantUpload = multer({
	storage: s3Storage,
	fileFilter: (_req, file, cb) => sanitizeFile(file, cb),
	limits: {
		fileSize: 1024 * 1024 * 5, // 5MB
		files: 2,
	},
});
