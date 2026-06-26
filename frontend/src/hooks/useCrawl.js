// frontend/src/hooks/useCrawl.js
// Dual-action react state hook supporting both classic crawling and optional planning sweeps.

import { useState, useCallback, useRef } from 'react';
import { addToHistory } from '../components/HistoryPanel';
import { FEATURE_FLAGS } from '../config/featureFlags';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://sitegrab-pro.onrender.com');

export function useCrawl() {
  const [status,   setStatus]   = useState('idle');    // idle | crawling | done | error
  const [logs,     setLogs]     = useState([]);
  const [progress, setProgress] = useState(0);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  // Dynamic Pre-Crawl Scanner States
  const [plannerStatus,   setPlannerStatus]   = useState('idle'); // idle | analyzing | completed | error
  const [plannerProgress, setPlannerProgress] = useState(0);
  const [plannerLog,      setPlannerLog]      = useState('');
  const [plannerReport,   setPlannerReport]   = useState(null);

  const abortRef = useRef(null);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setStatus('idle');
    setLogs([]);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const resetPlanner = useCallback(() => {
    setPlannerStatus('idle');
    setPlannerProgress(0);
    setPlannerLog('');
    setPlannerReport(null);
  }, []);

  /**
   * Runs Puppeteer homepage profiling (Falls back safely if toggled off)
   */
  const analyzeUrl = useCallback(async (url) => {
    if (!FEATURE_FLAGS.enableAIPlanner) return;

    resetPlanner();
    setPlannerStatus('analyzing');
    setPlannerProgress(5);
    setPlannerLog('Initializing AI pre-crawl scanner...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Server returned error status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Hold incomplete chunk

        for (const chunk of lines) {
          if (!chunk.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(chunk.slice(6));

            if (event.type === 'progress') {
              if (event.message) setPlannerLog(event.message);
              if (event.percent) setPlannerProgress(event.percent);
            }
            if (event.type === 'done') {
              setPlannerReport(event.report);
              setPlannerStatus('completed');
              setPlannerProgress(100);
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
      console.error('AI scan error:', err);
      setPlannerLog(err.message || 'Homepage profiling got disconnected.');
      setPlannerStatus('error');
    }
  }, [resetPlanner]);

  /**
   * Starts Cheerio or Puppeteer crawling with dynamic delays & concurrency parameters
   */
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
        throw new Error(body.error || `Crawler error status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Hold incomplete chunk

        for (const chunk of lines) {
          if (!chunk.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(chunk.slice(6));

            if (event.type === 'progress') {
              if (event.message) setLogs((l) => [...l, event.message]);
              if (event.percent) setProgress(event.percent);
            }
            if (event.type === 'complete') {
              setResult((prev) => ({ ...prev, ...event }));
              addToHistory(url);
            }
            if (event.type === 'done') {
              setResult((prev) => ({ ...prev, downloadUrl: event.downloadUrl, stats: event.stats }));
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
      console.error('Crawl execution error:', err);
      setError(err.message || 'Crawl was interrupted — please retry.');
      setStatus('error');
    }
  }, [reset]);

  return { 
    status, logs, progress, result, error, startCrawl, reset,
    plannerStatus, plannerProgress, plannerLog, plannerReport, analyzeUrl, resetPlanner
  };
}
