// components/ResultsPanel.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Archive, Download, RefreshCw } from 'lucide-react';
import './ResultsPanel.css';

function getCompatScore(result) {
  // Heuristic based on broken links ratio and file count
  const ratio = result.brokenCount / Math.max(result.fileCount, 1);
  if (ratio < 0.05) return { score: 92, label: 'Excellent', color: 'var(--success)' };
  if (ratio < 0.15) return { score: 74, label: 'Good',      color: 'var(--warning)' };
  return              { score: 45, label: 'Partial',   color: 'var(--error)'   };
}

export default function ResultsPanel({ result, url, onReset }) {
  const compat    = getCompatScore(result);
  const sizeMb    = (result.sizeBytes / 1024 / 1024).toFixed(2);

  const handleDownload = () => {
    if (!result.zipBase64) return;
    const blob = base64ToBlob(result.zipBase64, 'application/zip');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    a.download = `sitegrab-${hostname}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="results-wrap">
      {/* Stats row */}
      <div className="glass card results-card">
        <div className="results-header">
          <h3 className="results-title">
            <CheckCircle2 size={18} className="text-success" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Crawl Complete
          </h3>
          <button className="btn-new-crawl" onClick={onReset}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} />
            New Crawl
          </button>
        </div>

        <div className="stats-grid">
          {[
            { label: 'Pages',     value: result.pageCount },
            { label: 'Assets',    value: result.fileCount },
            { label: 'Broken',    value: result.brokenCount },
            { label: 'ZIP Size',  value: `${sizeMb} MB` },
          ].map(({ label, value }) => (
            <div key={label} className="stat-box glass-light">
              <div className="stat-box-value">{value}</div>
              <div className="stat-box-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Compatibility Score */}
        <div className="compat-row glass-light">
          <div className="compat-info">
            <span className="compat-title">Offline Compatibility</span>
            <span className="compat-sub">Estimated how well the site works offline</span>
          </div>
          <div className="compat-badge" style={{ borderColor: compat.color, color: compat.color }}>
            <span className="compat-score">{compat.score}%</span>
            <span className="compat-label">{compat.label}</span>
          </div>
        </div>
      </div>

      {/* Download card */}
      <motion.div
        className="glass card download-card"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="download-info">
          <div className="download-icon">
            <Archive size={32} />
          </div>
          <div>
            <div className="download-name font-mono">
              sitegrab-{url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname : 'site'}.zip
            </div>
            <div className="download-meta">{sizeMb} MB · {result.fileCount} files · ZIP</div>
          </div>
        </div>

        <button className="btn-download" onClick={handleDownload}>
          <Download size={18} style={{ marginRight: '8px' }} />
          Download ZIP
        </button>
      </motion.div>
    </div>
  );
}

function base64ToBlob(base64, mimeType) {
  const bytes = atob(base64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}
