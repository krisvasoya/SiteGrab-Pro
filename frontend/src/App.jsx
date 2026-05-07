// ─────────────────────────────────────────
//  App.jsx — SiteGrab Pro Main App
// ─────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings2, ChevronRight, Hexagon, AlertTriangle, Loader2 } from 'lucide-react';
import './styles/globals.css';
import './App.css';

import Header         from './components/Header';
import HeroSection    from './components/HeroSection';
import URLInput       from './components/URLInput';
import SettingsPanel  from './components/SettingsPanel';
import ProgressPanel  from './components/ProgressPanel';
import ResultsPanel   from './components/ResultsPanel';
import HistoryPanel   from './components/HistoryPanel';
import Footer         from './components/Footer';
import { useCrawl }   from './hooks/useCrawl';

export default function App() {
  const [url,          setUrl]          = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings,     setSettings]     = useState({
    depth: 3,
    assetTypes: ['html', 'css', 'js', 'images', 'fonts'],
    respectRobots: true,
    minify: false,
  });

  const { status, logs, progress, result, error, startCrawl, reset } = useCrawl();

  const handleProcess = useCallback(() => {
    if (!url.trim()) return;
    startCrawl(url.trim(), settings);
  }, [url, settings, startCrawl]);

  const isProcessing = status === 'crawling';
  const isDone       = status === 'done';
  const isIdle       = status === 'idle';

  return (
    <div className="app-wrapper">
      <div className="app-content">
        <Header />

        <main className="main-content">
          <HeroSection />

          {/* ── Input & Settings Card ───────── */}
          <AnimatePresence mode="wait">
            {(isIdle || status === 'error') && (
              <motion.div
                key="input-card"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
                className="glass card-main"
              >
                <URLInput
                  value={url}
                  onChange={setUrl}
                  onSubmit={handleProcess}
                  disabled={isProcessing}
                  error={error}
                />

                <button
                  className="settings-toggle"
                  onClick={() => setShowSettings((s) => !s)}
                  aria-expanded={showSettings}
                >
                  <Settings2 size={16} className="settings-icon" />
                  {showSettings ? 'Hide Settings' : 'Advanced Settings'}
                  <ChevronRight 
                    size={18} 
                    className={`chevron ${showSettings ? 'open' : ''}`} 
                  />
                </button>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      key="settings"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <SettingsPanel settings={settings} onChange={setSettings} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  className="btn-process"
                  onClick={handleProcess}
                  disabled={!url.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <><Loader2 className="spinner" size={18} /> Processing…</>
                  ) : (
                    <><Hexagon size={18} /> Grab Site</>
                  )}
                </button>

                {error && (
                  <motion.div
                    className="error-banner"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AlertTriangle size={16} /> {error}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Progress Panel ──────────────── */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
              >
                <ProgressPanel logs={logs} progress={progress} url={url} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Results Panel ───────────────── */}
          <AnimatePresence>
            {isDone && result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ResultsPanel result={result} url={url} onReset={reset} />
              </motion.div>
            )}
          </AnimatePresence>

          <HistoryPanel onSelect={setUrl} />
        </main>

        <Footer />
      </div>
    </div>
  );
}
