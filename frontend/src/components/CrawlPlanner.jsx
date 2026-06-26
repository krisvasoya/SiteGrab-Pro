// frontend/src/components/CrawlPlanner.jsx
// Stands as a completely isolated AI pre-crawl dashboard. Safe to delete.

import React, { useState } from 'react';
import { Sparkles, Play, ShieldAlert, Cpu, BarChart2, Zap, Hourglass, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import './CrawlPlanner.css';

export default function CrawlPlanner({
  url,
  status,
  progress,
  log,
  report,
  onApplySettings,
  onStartCrawl,
  onReset
}) {
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (!report) return;
    onApplySettings(report.recommendedSettings);
    setApplied(true);
  };

  // 1. Loading timeline stepper state
  if (status === 'analyzing') {
    const steps = [
      { id: 1, label: 'Spawning Puppeteer instance', threshold: 5 },
      { id: 2, label: 'Connecting and rendering DOM', threshold: 20 },
      { id: 3, label: 'Profiling JS frameworks & WebGL', threshold: 40 },
      { id: 4, label: 'Auditing asset files & connections', threshold: 65 },
      { id: 5, label: 'Formulating rules and warnings', threshold: 85 }
    ];

    return (
      <div className="glass card planner-card font-sans">
        <div className="planner-header loading">
          <Sparkles size={20} className="text-accent pulse" />
          <h4 className="title">AI Pre-Crawl Scanner Profiling...</h4>
        </div>
        
        <div className="planner-progress-box">
          <div className="planner-bar-track">
            <div className="planner-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="planner-pct font-mono">{progress}%</div>
          <div className="planner-log-status font-mono">{log}</div>
        </div>

        <div className="planner-stepper">
          {steps.map((s) => {
            const isCompleted = progress >= s.threshold;
            return (
              <div key={s.id} className={`step-item ${isCompleted ? 'active' : ''}`}>
                <div className="step-bullet">{isCompleted ? '✓' : s.id}</div>
                <span className="step-label">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Report dashboard state
  if (status === 'completed' && report) {
    const { architecture, complexity, loadTimeMs, linksCount, assetsCount, warnings, timeEstimate, potentialFileCount } = report;

    return (
      <div className="glass card planner-card font-sans">
        <div className="planner-header">
          <div className="header-meta">
            <Sparkles size={22} className="text-accent" />
            <h4 className="title">AI Pre-Crawl Analysis Complete</h4>
          </div>
          <button className="btn-planner-reset" onClick={onReset}>
            <RefreshCw size={12} /> Re-scan
          </button>
        </div>

        <div className="planner-complexity-grid">
          <div className="complexity-box glass-light">
            <Cpu size={18} className="text-accent" />
            <div className="label">Architecture</div>
            <div className="value">{architecture}</div>
          </div>

          <div className="complexity-box glass-light">
            <BarChart2 size={18} className="text-accent" />
            <div className="label">Complexity</div>
            <div className="value">{complexity}</div>
          </div>

          <div className="complexity-box glass-light">
            <Zap size={18} className="text-accent" />
            <div className="label">Response Time</div>
            <div className="value font-mono">{loadTimeMs}ms</div>
          </div>

          <div className="complexity-box glass-light">
            <Layers size={18} className="text-accent" />
            <div className="label">Internal Links</div>
            <div className="value font-mono">{linksCount} links</div>
          </div>
        </div>

        {/* Dynamic Warnings Checklist */}
        <div className="planner-section-title">
          <ShieldAlert size={16} /> Crawl Safeguards &amp; Warnings
        </div>

        {warnings.length > 0 ? (
          <div className="warnings-stack">
            {warnings.map((w, index) => (
              <div key={index} className="warning-card glass-light">
                <div className="warning-indicator font-mono">⚠️</div>
                <div className="warning-text">
                  <div className="warning-title">{w.title}</div>
                  <div className="warning-desc">{w.text}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="warnings-clear-badge glass-light text-success">
            <CheckCircle2 size={16} /> No crawl barriers or CAPTCHAs detected on this domain.
          </div>
        )}

        {/* Dynamic Compare Table */}
        <div className="planner-section-title">
          <Layers size={16} /> Recommended Settings
        </div>

        <table className="planner-compare-table">
          <thead>
            <tr>
              <th>Setting</th>
              <th>Default Settings</th>
              <th className="recommended-col">AI Recommended Rules</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Crawl Mode</td>
              <td>Standard (Static)</td>
              <td className="recommended-col font-mono uppercase">{report.recommendedSettings.mode}</td>
            </tr>
            <tr>
              <td>Depth Levels</td>
              <td>3 levels</td>
              <td className="recommended-col font-mono">{report.recommendedSettings.depth} levels</td>
            </tr>
            <tr>
              <td>Concurrent Links</td>
              <td>5 requests</td>
              <td className="recommended-col font-mono">{report.recommendedSettings.concurrency} concurrent</td>
            </tr>
            <tr>
              <td>Request Delay</td>
              <td>800ms</td>
              <td className="recommended-col font-mono">{report.recommendedSettings.requestDelay}ms</td>
            </tr>
          </tbody>
        </table>

        {/* Cost & Estimates Box */}
        <div className="planner-estimates-box glass-light">
          <div className="estimate-item">
            <Hourglass size={16} />
            <div>
              <span className="lbl">Est. Time: </span>
              <span className="val font-mono">{timeEstimate}</span>
            </div>
          </div>
          <div className="estimate-item">
            <Layers size={16} />
            <div>
              <span className="lbl">Est. Files: </span>
              <span className="val font-mono">~{potentialFileCount} files</span>
            </div>
          </div>
        </div>

        {/* Interactive Action Buttons */}
        <div className="planner-action-bar">
          <button
            className={`btn-apply-settings ${applied ? 'applied' : ''}`}
            onClick={handleApply}
            disabled={applied}
          >
            {applied ? (
              <><CheckCircle2 size={16} /> Rules Applied successfully!</>
            ) : (
              <><Sparkles size={16} /> Apply AI Recommended Settings</>
            )}
          </button>

          <button className="btn-planner-start" onClick={onStartCrawl}>
            <Play size={16} /> Start Crawling Now
          </button>
        </div>
      </div>
    );
  }

  return null;
}
