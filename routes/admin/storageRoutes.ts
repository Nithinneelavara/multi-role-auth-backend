//project\routes\admin\storageRoutes.ts
import express from 'express';
import { generateUploadUrl, generateDownloadUrl } from '../../controllers/admin/storageController';

const router = express.Router();

router.get('/upload-url', generateUploadUrl);
router.get('/download-url', generateDownloadUrl);

export default router;