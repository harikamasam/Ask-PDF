import { useEffect, useRef, useState } from 'react';
import { getJobStatus, streamChat, uploadPdf } from './api.js';
import { Header } from './components/Header.jsx';
import { UploadScreen } from './components/UploadScreen.jsx';
import { ProcessingScreen } from './components/ProcessingScreen.jsx';
import { ChatScreen } from './components/ChatScreen.jsx';

const initialState = {
  screen: 'upload',
  fileName: '',
  jobId: null,
  documentId: null,
  status: null,
  error: '',
  uploading: false,
  uploadProgress: 0,
  messages: [],
  question: '',
  isStreaming: false
};

export function App() {
  const [state, setState] = useState(initialState);
  const inputRef = useRef(null);

  function patch(partial) {
    setState((current) => ({ ...current, ...partial }));
  }

  function resetToUpload() {
    setState({ ...initialState });
  }

  useEffect(() => {
    if (!state.jobId || state.screen !== 'processing') {
      return undefined;
    }

    if (state.status?.status === 'ready' || state.status?.status === 'failed') {
      return undefined;
    }

    let cancelled = false;

    async function poll() {
      try {
        const nextStatus = await getJobStatus(state.jobId);
        if (cancelled) {
          return;
        }

        if (nextStatus.status === 'ready') {
          patch({
            status: nextStatus,
            documentId: nextStatus.documentId,
            screen: 'chat',
            error: ''
          });
          return;
        }

        if (nextStatus.status === 'failed') {
          patch({
            status: nextStatus,
            error: nextStatus.error || 'Document processing failed'
          });
          return;
        }

        patch({ status: nextStatus });
      } catch (pollError) {
        if (!cancelled) {
          patch({ error: pollError.message });
        }
      }
    }

    poll();
    const interval = setInterval(poll, 1200);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state.jobId, state.screen, state.status?.status]);

  async function handleUpload(file) {
    patch({
      uploading: true,
      uploadProgress: 0,
      error: '',
      fileName: file.name,
      messages: [],
      status: null,
      jobId: null,
      documentId: null
    });

    try {
      const result = await uploadPdf(file, (progress) => {
        patch({ uploadProgress: progress });
      });

      patch({
        uploading: false,
        uploadProgress: 100,
        jobId: result.jobId,
        documentId: result.documentId,
        status: { ...result, stage: 'queued', progress: 0 },
        screen: 'processing',
        error: ''
      });
    } catch (uploadError) {
      patch({
        uploading: false,
        uploadProgress: 0,
        error: uploadError.message || 'Upload failed',
        screen: 'upload'
      });
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    const trimmed = state.question.trim();
    if (!trimmed || !state.documentId || state.isStreaming) {
      return;
    }

    const history = state.messages.map((message) => ({
      role: message.role,
      content: message.content
    }));

    const assistantId = crypto.randomUUID();
    patch({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), role: 'user', content: trimmed },
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          sources: [],
          streaming: true,
          thinking: true
        }
      ],
      question: '',
      isStreaming: true
    });

    try {
      await streamChat({
        documentId: state.documentId,
        question: trimmed,
        conversationHistory: history,
        onEvent: (eventName, data) => {
          setState((current) => ({
            ...current,
            messages: current.messages.map((message) => {
              if (message.id !== assistantId) {
                return message;
              }

              if (eventName === 'metadata') {
                return {
                  ...message,
                  sources: data.sources || [],
                  thinking: false
                };
              }

              if (eventName === 'token') {
                return {
                  ...message,
                  content: message.content + data.token,
                  thinking: false
                };
              }

              if (eventName === 'low_confidence') {
                return {
                  ...message,
                  content: data.message,
                  streaming: false,
                  thinking: false,
                  lowConfidence: true
                };
              }

              if (eventName === 'error') {
                return {
                  ...message,
                  content: data.message,
                  streaming: false,
                  thinking: false,
                  error: true
                };
              }

              return message;
            })
          }));
        }
      });
    } catch (chatError) {
      setState((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: chatError.message,
                streaming: false,
                thinking: false,
                error: true
              }
            : message
        )
      }));
    } finally {
      setState((current) => ({
        ...current,
        isStreaming: false,
        messages: current.messages.map((message) =>
          message.id === assistantId ? { ...message, streaming: false, thinking: false } : message
        )
      }));
      inputRef.current?.focus();
    }
  }

  const showNewDocument = state.screen !== 'upload' || Boolean(state.fileName);

  return (
    <div className="min-h-screen">
      <Header
        documentName={state.screen === 'chat' ? state.fileName : ''}
        showNewDocument={showNewDocument}
        onNewDocument={resetToUpload}
      />

      <main>
        {state.screen === 'upload' && (
          <UploadScreen
            onUpload={handleUpload}
            uploading={state.uploading}
            uploadProgress={state.uploadProgress}
            error={state.error}
            onClearError={() => patch({ error: '' })}
          />
        )}

        {state.screen === 'processing' && (
          <ProcessingScreen
            status={state.status}
            fileName={state.fileName}
            error={state.error}
            onRetry={resetToUpload}
          />
        )}

        {state.screen === 'chat' && (
          <ChatScreen
            messages={state.messages}
            question={state.question}
            setQuestion={(question) => patch({ question })}
            onSubmit={askQuestion}
            isStreaming={state.isStreaming}
            documentName={state.fileName}
            inputRef={inputRef}
          />
        )}
      </main>
    </div>
  );
}
