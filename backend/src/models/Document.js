import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  filePath: { type: String, required: true },
  status: {
    type: String,
    enum: ['queued', 'processing', 'ready', 'failed'],
    default: 'queued',
    index: true
  },
  uploadedAt: { type: Date, default: Date.now },
  processingStartedAt: Date,
  completedAt: Date,
  sizeBytes: { type: Number, required: true },
  totalChunks: { type: Number, default: 0 },
  jobId: { type: String, index: true },
  error: String
}, { timestamps: true });

export const Document = mongoose.model('Document', documentSchema);
