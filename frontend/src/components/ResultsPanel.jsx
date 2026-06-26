// frontend/src/components/ResultsPanel.jsx
// Displays crawler results with option circular success statistics. Safe to delete options.

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Archive, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { FEATURE_FLAGS } from '../config/featureFlags';
import './ResultsPanel.css';

function getCompatScore(result) {
  const ratio = result.brokenCount / Math.max(result.fileCount, 1);
  if (ratio < 0.05) return { score: 92, label: 'Excellent', color: 'var(--success)' };
  if (ratio < 0.15) return { score: 74, label: 'Good',      color: 'var(--warning)' };
  return              { score: 45, label: 'Partial',   color: 'var(--error)'   };
}

export default function ResultsPanel({ result, url, onReset, mode }) {
  const stats = result.stats || {};
  const pageCount = stats.pages ?? result.pageCount ?? 0;
  const fileCount = stats.assets ?? result.fileCount ?? 0;
  const brokenCount = stats.broken ?? result.brokenCount ?? 0;
  const blockedCount = stats.blocked ?? 0;
  const sizeMb = stats.zipSizeMB ?? (result.sizeBytes ? (result.sizeBytes / 1024 / 1024).toFixed(2) : '0.00');

  let compat = { score: 100, label: 'Excellent', color: 'var(--success)' };
  const hasWebGL = stats.webgl?.detected || false;

  if (stats.score !== undefined) {
    const s = stats.score;
    if (s >= 90) compat = { score: s, label: 'Excellent', color: 'var(--success)' };
    else if (s >= 70) compat = { score: s, label: 'Good', color: 'var(--warning)' };
    else compat = { score: s, label: 'Partial', color: 'var(--error)' };
  } else {
    const rawCompat = getCompatScore({ brokenCount, fileCount });
    const s = rawCompat.score;
    if (s >= 90) compat = { score: s, label: 'Excellent', color: 'var(--success)' };
    else if (s >= 70) compat = { score: s, label: 'Good', color: 'var(--warning)' };
    else compat = { score: s, label: 'Partial', color: 'var(--error)' };
  }

  const hostname = url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname : 'site';
  const showJsWarning = mode === 'standard' && fileCount < 5 && sizeMb > 0.05;

  const handleDownload = () => {
    if (result.downloadUrl) {
      const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://sitegrab-pro.onrender.com');
      window.location.href = `${API_URL}${result.downloadUrl}`;
      return;
    }
    
    if (!result.zipBase64) return;
    const blob = base64ToBlob(result.zipBase64, 'application/zip');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `sitegrab-${hostname}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="results-wrap font-sans">
      {/* ── Main Stats Card ───────── */}
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
            { label: 'Pages',     value: pageCount },
            { label: 'Assets',    value: fileCount },
            { label: 'Broken',    value: brokenCount },
            ...(blockedCount > 0 ? [{ label: 'Blocked', value: blockedCount }] : []),
            { label: 'ZIP Size',  value: `${sizeMb} MB` },
          ].map(({ label, value }) => (
            <div key={label} className="stat-box glass-light">
              <div className="stat-box-value font-mono">{value}</div>
              <div className="stat-box-label">{label}</div>
            </div>
          ))}
        </div>

        {showJsWarning && (
          <div style={{ margin: '16px 0', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
            <AlertTriangle size={18} />
            <div style={{ fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'left' }}>
              <strong>JS-Heavy Site Detected.</strong> Very few files were downloaded. The site likely uses dynamic rendering. 
              Switch to <strong>Deep Crawl</strong> mode for higher asset fidelity.
            </div>
          </div>
        )}

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

        {hasWebGL && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid #f97316', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316' }}>
            <span style={{ fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'left' }}>
              ⚠️ WebGL context was preserved. High-resolution canvas snapshots have been captured in the local `_captures` output folder.
            </span>
          </div>
        )}
      </div>

      {/* ── Optional File Success / Failure Report (Dynamic Flag) ── */}
      {FEATURE_FLAGS.enableIntegrityReport && stats.postCrawlReport && (
        <motion.div
          className="glass card integrity-report-card"
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1,    opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="report-header">
            <CheckCircle2 size={18} className="text-success" />
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>File Integrity Report</h4>
          </div>

          <div className="report-dashboard-grid">
            <div className="circular-chart-box">
              <svg viewBox="0 0 36 36" className="circular-svg">
                <defs>
                  <filter id="glow-integrity" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="0.8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <path
                  className="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle-fill"
                  filter="url(#glow-integrity)"
                  strokeDasharray={`${stats.postCrawlReport.successRate}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  stroke={stats.postCrawlReport.successRate > 90 ? 'var(--success)' : stats.postCrawlReport.successRate > 60 ? 'var(--warning)' : 'var(--error)'}
                />
              </svg>
              <div className="percentage font-mono">{stats.postCrawlReport.successRate}%</div>
              <div className="chart-label">Success</div>
            </div>

            <div className="report-stats">
              <div className="report-stat-row">
                <span className="label">Attempted Files</span>
                <span className="val font-mono">{stats.postCrawlReport.totalAttempted}</span>
              </div>
              <div className="report-stat-row">
                <span className="label">Saved successfully</span>
                <span className="val text-success font-mono">{stats.postCrawlReport.successful}</span>
              </div>
              <div className="report-stat-row">
                <span className="label">Corrupt / Failed</span>
                <span className="val text-error font-mono">{stats.postCrawlReport.failed}</span>
              </div>
            </div>
          </div>

          {stats.postCrawlReport.failed > 0 ? (
            <div className="failed-dropdown-section">
              <details className="failed-details glass-light">
                <summary className="font-mono">
                  Inspect {stats.postCrawlReport.failed} Failed Assets &amp; Fixes
                </summary>
                <div className="failed-list">
                  {stats.postCrawlReport.failedAssets.map((asset, index) => (
                    <div key={index} className="failed-asset-item">
                      <div className="failed-asset-meta">
                        <span className="failed-asset-url font-mono" title={asset.url}>
                          {asset.url.length > 50 ? asset.url.substring(0, 50) + '...' : asset.url}
                        </span>
                        <span className="failed-asset-type font-sans">
                          {asset.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="failed-asset-reason font-sans">
                        <span className="label font-mono">Error:</span> {asset.reason}
                      </div>
                      <div className="failed-asset-fix font-sans">
                        <span className="label font-mono">Recommendation:</span> {asset.fix}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <div className="integrity-perfect-badge glass-light text-success font-sans">
              <CheckCircle2 size={16} /> All downloaded resources parsed and verified with pristine integrity.
            </div>
          )}
        </motion.div>
      )}

      {/* ── Download Card ───────── */}
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
              sitegrab-{hostname}.zip
            </div>
            <div className="download-meta">{sizeMb} MB · {fileCount} files · ZIP</div>
          </div>
        </div>

        <button className="btn-download" onClick={handleDownload}>
          <Download size={18} style={{ marginRight: '8px' }} />
          Download ZIP Archive
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
