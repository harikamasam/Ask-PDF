import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: (value) => Array.isArray(value) && value.length === 768,
      message: 'Embedding must contain exactly 768 dimensions'
    }
  },
  sourcePage: { type: Number, default: 1 },
  jobId: { type: String, index: true }
}, { timestamps: true });

chunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

export const Chunk = mongoose.model('Chunk', chunkSchema);
