import { FileText, Plus } from 'lucide-react';

export function Header({ documentName, onNewDocument, showNewDocument }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 ring-1 ring-accent-400/30"
            aria-hidden
          >
            <FileText className="h-4.5 w-4.5 text-accent-400" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold tracking-tight text-ink-50">AskPDF</p>
            {documentName ? (
              <p className="truncate text-xs text-ink-400 sm:text-sm">{documentName}</p>
            ) : (
              <p className="hidden text-xs text-ink-400 sm:block">Document-grounded Q&amp;A</p>
            )}
          </div>
        </div>

        {showNewDocument && (
          <button
            type="button"
            onClick={onNewDocument}
            className="inline-flex items-center gap-2 rounded-xl bg-surface-800 px-3 py-2 text-sm font-medium text-ink-100 ring-1 ring-white/10 transition hover:bg-surface-700 hover:ring-accent-400/30 active:scale-[0.98] sm:px-4"
          >
            <Plus className="h-4 w-4 text-accent-400" />
            <span className="hidden sm:inline">New Document</span>
            <span className="sm:hidden">New</span>
          </button>
        )}
      </div>
    </header>
  );
}
