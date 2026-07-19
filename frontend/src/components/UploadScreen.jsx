import { useRef, useState } from 'react';
import { AlertCircle, FileUp, UploadCloud } from 'lucide-react';

const MAX_BYTES = 20 * 1024 * 1024;

function validateFile(file) {
  if (!file) {
    return 'Choose a PDF to continue.';
  }

  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    return 'Only PDF files are supported. Please choose a .pdf file.';
  }

  if (file.size > MAX_BYTES) {
    return `This file is too large (${formatBytes(file.size)}). Maximum size is 20 MB.`;
  }

  return '';
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadScreen({ onUpload, uploading, uploadProgress, error, onClearError }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [selectedName, setSelectedName] = useState('');

  function handleFile(file) {
    onClearError?.();
    const message = validateFile(file);
    setValidationError(message);
    if (message || !file) {
      setSelectedName('');
      return;
    }
    setSelectedName(file.name);
    onUpload(file);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  }

  const displayError = validationError || error;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-16">
      <div className="animate-slide-up text-center">
        <p className="mb-3 font-display text-sm font-medium uppercase tracking-[0.18em] text-accent-400">
          RAG-powered PDF assistant
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl md:text-6xl">
          Ask anything about your{' '}
          <span className="text-gradient">PDF</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg">
          Upload a document. AskPDF parses, chunks, and embeds it — then streams answers
          grounded only in what the file actually says.
        </p>
      </div>

      <div
        className={[
          'glass-panel animate-slide-up mt-10 rounded-2xl p-1 transition duration-200',
          dragActive ? 'ring-2 ring-accent-400/60' : ''
        ].join(' ')}
        style={{ animationDelay: '80ms' }}
      >
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setDragActive(false);
            }
          }}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={[
            'flex cursor-pointer flex-col items-center rounded-[14px] border border-dashed px-6 py-12 text-center transition duration-200 sm:px-10 sm:py-14',
            dragActive
              ? 'border-accent-400 bg-accent-500/10'
              : 'border-white/15 bg-surface-900/40 hover:border-accent-400/40 hover:bg-accent-500/5',
            uploading ? 'pointer-events-none opacity-70' : ''
          ].join(' ')}
        >
          <div
            className={[
              'mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition duration-200',
              dragActive ? 'bg-accent-500/20 text-accent-300' : 'bg-surface-800 text-accent-400'
            ].join(' ')}
          >
            {uploading ? <FileUp className="h-7 w-7 animate-pulse-soft" /> : <UploadCloud className="h-7 w-7" />}
          </div>

          <p className="font-display text-lg font-semibold text-ink-50 sm:text-xl">
            {uploading ? 'Uploading your PDF…' : dragActive ? 'Drop to upload' : 'Drag & drop your PDF here'}
          </p>
          <p className="mt-2 text-sm text-ink-400">
            {selectedName && !uploading
              ? selectedName
              : 'PDF only · max 20 MB'}
          </p>

          {uploading && (
            <div className="mt-6 w-full max-w-xs">
              <div className="mb-2 flex justify-between text-xs text-ink-400">
                <span>Uploading</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-700">
                <div
                  className="h-full rounded-full bg-accent-500 transition-[width] duration-200 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {!uploading && (
            <span className="mt-6 inline-flex items-center rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-surface-950 shadow-lg shadow-accent-500/20 transition hover:bg-accent-400 active:scale-[0.98]">
              Browse files
            </span>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              handleFile(file);
              event.target.value = '';
            }}
          />
        </div>
      </div>

      {displayError && (
        <div
          className="animate-fade-in mt-4 flex items-start gap-3 rounded-xl border border-danger-400/25 bg-danger-900/40 px-4 py-3 text-sm text-danger-400"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{displayError}</p>
        </div>
      )}
    </section>
  );
}
