// components/ProgressPanel.jsx
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Activity } from 'lucide-react';
import './ProgressPanel.css';

export default function ProgressPanel({ logs, progress, url }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="glass card progress-card">
      <div className="progress-header">
        <div>
          <h3 className="progress-title">Crawling in Progress</h3>
          <p className="progress-url font-mono">{url}</p>
        </div>
        <div className="progress-pct">{progress}%</div>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeOut', duration: 0.5 }}
        />
        <div className="progress-glow" style={{ left: `${progress}%` }} />
      </div>

      {/* Live log */}
      <div className="log-container" ref={logRef}>
        {logs.map((log, i) => (
          <motion.div
            key={i}
            className="log-line"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={12} className="log-arrow" />
            <span className="log-msg">{log}</span>
          </motion.div>
        ))}
        {logs.length === 0 && (
          <div className="log-line log-line--muted">
            <ChevronRight size={12} className="log-arrow" />
            <span>Launching browser…</span>
          </div>
        )}
      </div>

      <div className="progress-footer">
        <span className="pulse-indicator">
          <Activity size={14} className="text-accent" />
          Live crawl
        </span>
        <span className="text-muted" style={{ fontSize: '0.78rem' }}>
          Do not close this tab
        </span>
      </div>
    </div>
  );
}
