import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { Document } from '../models/Document.js';
import { enqueueJob, getJobStatus, setJobStatus } from '../services/jobStatusService.js';

const router = express.Router();

fs.mkdirSync(env.uploadDir, { recursive: true });

const upload = multer({
  dest: env.uploadDir,
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
    if (!isPdf) {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  }
});

router.post('/upload', upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('Missing PDF upload field named "pdf"');
      error.statusCode = 400;
      throw error;
    }

    const jobId = uuidv4();
    const document = await Document.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      status: 'queued',
      sizeBytes: req.file.size,
      jobId
    });

    await setJobStatus(jobId, {
      status: 'queued',
      stage: 'queued',
      progress: 0,
      documentId: document._id.toString(),
      filename: req.file.originalname
    });

    await enqueueJob(env.queueName, {
      jobId,
      documentId: document._id.toString(),
      filePath: req.file.path
    });

    res.status(202).json({
      jobId,
      documentId: document._id.toString(),
      status: 'queued'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/status/:jobId', async (req, res, next) => {
  try {
    const status = await getJobStatus(req.params.jobId);
    if (!Object.keys(status).length) {
      const error = new Error('Job not found');
      error.statusCode = 404;
      throw error;
    }

    const document = status.documentId ? await Document.findById(status.documentId).lean() : null;
    res.json({
      jobId: req.params.jobId,
      ...status,
      progress: Number(status.progress || 0),
      document
    });
  } catch (error) {
    next(error);
  }
});

export { router as documentsRouter };
