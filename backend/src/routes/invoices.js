import { Router } from 'express';
import multer from 'multer';
import { extractInvoice, listInvoices, getInvoice } from '../controllers/invoiceController.js';
import { requireAuth } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf');
  },
});

const router = Router();

router.use(requireAuth);

router.post('/extract', upload.single('pdf'), extractInvoice);
router.get('/', listInvoices);
router.get('/:id', getInvoice);

export default router;
