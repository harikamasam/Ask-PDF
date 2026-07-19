const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  if (!API_BASE) {
    throw new Error(
      'VITE_API_URL is not set. Add it to your .env (local) or Vercel project settings (production).'
    );
  }
  return `${API_BASE}${path}`;
}

export async function uploadPdf(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('pdf', file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body);
        } else {
          reject(new Error(body.error || 'Upload failed'));
        }
      } catch {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading'));
    xhr.open('POST', apiUrl('/api/documents/upload'));
    xhr.send(formData);
  });
}

export async function getJobStatus(jobId) {
  const response = await fetch(apiUrl(`/api/documents/status/${jobId}`));
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Unable to fetch job status');
  }
  return body;
}

export async function streamChat({ documentId, question, conversationHistory, onEvent }) {
  const response = await fetch(apiUrl('/api/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({ documentId, question, conversationHistory })
  });

  if (!response.ok || !response.body) {
    throw new Error('Chat request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const eventBlock of events) {
      const eventName = eventBlock.match(/^event: (.+)$/m)?.[1];
      const dataText = eventBlock.match(/^data: (.+)$/m)?.[1];
      if (eventName && dataText) {
        onEvent(eventName, JSON.parse(dataText));
      }
    }
  }
}
