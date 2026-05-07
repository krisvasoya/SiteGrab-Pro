// hooks/useCrawl.js
import { useState, useCallback, useRef } from 'react';
import { addToHistory } from '../components/HistoryPanel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function useCrawl() {
  const [status,   setStatus]   = useState('idle');    // idle | crawling | done | error
  const [logs,     setLogs]     = useState([]);
  const [progress, setProgress] = useState(0);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setStatus('idle');
    setLogs([]);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const startCrawl = useCallback(async (url, settings) => {
    reset();
    setStatus('crawling');
    setProgress(5);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/api/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, ...settings }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${response.status}`);
      }

      // ── Parse SSE stream ─────────────────────
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep incomplete chunk

        for (const chunk of lines) {
          if (!chunk.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(chunk.slice(6));

            if (event.type === 'progress') {
              if (event.message) setLogs((l) => [...l, event.message]);
              if (event.percent)  setProgress(event.percent);
            }
            if (event.type === 'complete') {
              setResult((prev) => ({ ...prev, ...event }));
              addToHistory(url);
            }
            if (event.type === 'zip') {
              setResult((prev) => ({ ...prev, zipBase64: event.data }));
              setStatus('done');
              setProgress(100);
            }
            if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Crawl error:', err);
      setError(err.message || 'Unexpected error — please try again.');
      setStatus('error');
    }
  }, [reset]);

  return { status, logs, progress, result, error, startCrawl, reset };
}
