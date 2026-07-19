import { AlertCircle, Check, Loader2, RotateCcw } from 'lucide-react';

const PIPELINE_STAGES = [
  { key: 'parsing', label: 'Parse', description: 'Extract text & pages' },
  { key: 'chunking', label: 'Chunk', description: 'Split into passages' },
  { key: 'embedding', label: 'Embed', description: 'Create vectors' },
  { key: 'indexing', label: 'Index', description: 'Store for search' },
  { key: 'ready', label: 'Ready', description: 'Ask questions' }
];

const STAGE_ORDER = PIPELINE_STAGES.map((stage) => stage.key);

function stageIndex(stage) {
  if (!stage) {
    return -1;
  }
  if (stage === 'queued' || stage === 'processing') {
    return 0;
  }
  const index = STAGE_ORDER.indexOf(stage);
  return index;
}

export function ProcessingScreen({ status, fileName, error, onRetry }) {
  const currentStage = status?.stage || status?.status || 'queued';
  const currentIndex = stageIndex(currentStage);
  const progress = Number(status?.progress || 0);
  const failed = status?.status === 'failed' || Boolean(error);
  const isReady = status?.status === 'ready' || currentStage === 'ready';

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-14">
      <div className="animate-slide-up text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
          {failed ? 'Processing failed' : isReady ? 'Document ready' : 'Preparing your document'}
        </h1>
        <p className="mt-3 text-ink-300">
          {fileName ? (
            <>
              Working on <span className="font-medium text-ink-100">{fileName}</span>
            </>
          ) : (
            'Running the RAG pipeline'
          )}
        </p>
      </div>

      <div className="glass-panel animate-slide-up mt-10 rounded-2xl p-6 sm:p-8" style={{ animationDelay: '60ms' }}>
        {!failed && (
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="capitalize text-ink-300">
                {isReady ? 'Complete' : currentStage === 'queued' ? 'Queued' : currentStage}
              </span>
              <span className="font-medium tabular-nums text-accent-400">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(progress, isReady ? 100 : 4)}%` }}
              />
            </div>
          </div>
        )}

        <ol className="grid gap-0 sm:grid-cols-5">
          {PIPELINE_STAGES.map((stage, index) => {
            const completed = !failed && (isReady || currentIndex > index || (currentIndex === index && stage.key === 'ready'));
            const active = !failed && !isReady && currentIndex === index;
            const pending = !completed && !active;

            return (
              <li key={stage.key} className="relative flex sm:flex-col">
                {index < PIPELINE_STAGES.length - 1 && (
                  <div
                    className={[
                      'absolute left-5 top-10 h-[calc(100%-2.5rem)] w-px sm:left-[calc(50%+1.25rem)] sm:top-5 sm:h-px sm:w-[calc(100%-2.5rem)]',
                      completed ? 'bg-accent-500' : 'bg-surface-600'
                    ].join(' ')}
                    aria-hidden
                  />
                )}

                <div className="relative z-10 flex flex-1 gap-4 pb-6 sm:flex-col sm:items-center sm:gap-3 sm:pb-0 sm:text-center">
                  <div
                    className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 transition duration-300',
                      completed
                        ? 'bg-accent-500 text-surface-950 ring-accent-400/40'
                        : active
                          ? 'bg-accent-500/20 text-accent-300 ring-accent-400/50'
                          : failed && active
                            ? 'bg-danger-500/20 text-danger-400 ring-danger-400/40'
                            : 'bg-surface-800 text-ink-400 ring-surface-600'
                    ].join(' ')}
                  >
                    {completed ? (
                      <Check className="h-5 w-5" strokeWidth={2.5} />
                    ) : active && !failed ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="font-display text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <div className={pending ? 'opacity-50' : ''}>
                    <p className="font-display text-sm font-semibold text-ink-100">{stage.label}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{stage.description}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {!failed && !isReady && (
          <div className="mt-8 space-y-2 sm:mt-10">
            <div className="animate-shimmer h-3 w-3/4 rounded-md" />
            <div className="animate-shimmer h-3 w-1/2 rounded-md" style={{ animationDelay: '120ms' }} />
            <div className="animate-shimmer h-3 w-2/3 rounded-md" style={{ animationDelay: '240ms' }} />
          </div>
        )}

        {failed && (
          <div className="mt-6 rounded-xl border border-danger-400/25 bg-danger-900/30 px-4 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-400" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-danger-400">Something went wrong</p>
                <p className="mt-1 text-sm text-ink-300">
                  {error || status?.error || 'Document processing failed. You can try uploading again.'}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-surface-800 px-4 py-2 text-sm font-medium text-ink-100 ring-1 ring-white/10 transition hover:bg-surface-700 active:scale-[0.98]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
