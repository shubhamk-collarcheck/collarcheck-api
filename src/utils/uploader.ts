import fs from 'fs';
import multer from 'multer';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads', 'document');

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/document/');
	},
	filename: (req, file, cb) => {
		// Generate a unique filename to prevent overwriting
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
	}
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback
) => {
	const allowedTypes = ['application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'image/jpeg',
		'image/png'
	];

	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
	}
};

export const upload = multer({
	storage: storage,
	limits: {
		fileSize: 1024 * 1024 * 5 // 5MB limit
	},
	fileFilter: fileFilter
});
