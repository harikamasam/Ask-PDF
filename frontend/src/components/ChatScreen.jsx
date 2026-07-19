import { useEffect, useRef } from 'react';
import { AlertTriangle, BookOpen, FileText, Send, ShieldAlert } from 'lucide-react';

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-300">
      <span className="flex items-center gap-1.5">
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent-400" />
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent-400" />
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent-400" />
      </span>
      <span>AI is thinking…</span>
    </div>
  );
}

function SourceChips({ sources }) {
  if (!sources?.length) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((source) => (
        <details
          key={`${source.chunkIndex}-${source.label}`}
          className="group rounded-lg bg-surface-900/70 ring-1 ring-white/8 open:ring-accent-400/25"
        >
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-accent-300 marker:content-none [&::-webkit-details-marker]:hidden">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            {source.label} · p.{source.sourcePage}
          </summary>
          <p className="border-t border-white/5 px-2.5 py-2 text-xs leading-relaxed text-ink-400">
            {source.preview}
          </p>
        </details>
      ))}
    </div>
  );
}

function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <article className="animate-fade-in ml-auto max-w-[88%] sm:max-w-[75%]">
        <div className="rounded-2xl rounded-br-md bg-accent-600 px-4 py-3 text-[15px] leading-relaxed text-white shadow-lg shadow-accent-600/15">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </article>
    );
  }

  if (message.lowConfidence) {
    return (
      <article className="animate-fade-in mr-auto max-w-[92%] sm:max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md border border-warn-500/30 bg-warn-500/10 px-4 py-3.5">
          <div className="mb-2 flex items-center gap-2 text-warn-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="font-display text-xs font-semibold uppercase tracking-wider">
              Hallucination guard
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-ink-100">{message.content}</p>
          <p className="mt-2 text-xs text-ink-400">
            Not enough supporting context was found in the document for a grounded answer.
          </p>
        </div>
      </article>
    );
  }

  if (message.error) {
    return (
      <article className="animate-fade-in mr-auto max-w-[92%] sm:max-w-[80%]">
        <div className="rounded-2xl rounded-bl-md border border-danger-400/25 bg-danger-900/35 px-4 py-3.5">
          <div className="mb-2 flex items-center gap-2 text-danger-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-display text-xs font-semibold uppercase tracking-wider">Error</span>
          </div>
          <p className="text-[15px] leading-relaxed text-ink-100">{message.content}</p>
        </div>
      </article>
    );
  }

  const showThinking = message.streaming && !message.content;

  return (
    <article className="animate-fade-in mr-auto max-w-[92%] sm:max-w-[80%]">
      <div className="rounded-2xl rounded-bl-md bg-surface-800/90 px-4 py-3.5 ring-1 ring-white/8">
        {showThinking ? (
          <ThinkingIndicator />
        ) : (
          <p className="text-[15px] leading-relaxed text-ink-50 whitespace-pre-wrap">
            {message.content}
            {message.streaming && (
              <span className="animate-caret ml-0.5 inline-block text-accent-400" aria-hidden>
                ▍
              </span>
            )}
          </p>
        )}
        <SourceChips sources={message.sources} />
      </div>
    </article>
  );
}

export function ChatScreen({
  messages,
  question,
  setQuestion,
  onSubmit,
  isStreaming,
  documentName,
  inputRef
}) {
  const bottomRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <section className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-3xl flex-col px-4 sm:px-6">
      <div className="shrink-0 border-b border-white/5 py-4">
        <p className="font-display text-sm font-medium text-ink-300">
          Chatting with{' '}
          <span className="text-ink-50">{documentName || 'your document'}</span>
        </p>
      </div>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="m-auto flex max-w-sm flex-col items-center px-4 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-800 text-accent-400 ring-1 ring-white/8">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-50">Ask your first question</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              Answers stream live and cite the pages they came from. Off-topic questions are blocked by the
              hallucination guard.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-white/5 bg-surface-950/40 pb-5 pt-3 backdrop-blur-sm"
      >
        <div className="glass-panel flex items-end gap-2 rounded-2xl p-2 pl-3 sm:pl-4">
          <label className="sr-only" htmlFor="askpdf-question">
            Ask a question
          </label>
          <textarea
            id="askpdf-question"
            ref={inputRef}
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask about this PDF…"
            disabled={isStreaming}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-ink-50 outline-none placeholder:text-ink-400"
          />
          <button
            type="submit"
            disabled={isStreaming || !question.trim()}
            aria-label="Send question"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-surface-950 shadow-lg shadow-accent-500/20 transition hover:bg-accent-400 active:scale-95 disabled:shadow-none"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-xs text-ink-400">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </section>
  );
}
