// frontend/src/App.jsx
// Main application dashboard utilizing premium glassmorphism and safe dynamic lazy-loading.

import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings2, ChevronRight, Hexagon, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import './styles/globals.css';
import './App.css';

import Header         from './components/Header';
import HeroSection    from './components/HeroSection';
import URLInput       from './components/URLInput';
import SettingsPanel  from './components/SettingsPanel';
import ProgressPanel  from './components/ProgressPanel';
import ResultsPanel   from './components/ResultsPanel';
import HistoryPanel   from './components/HistoryPanel';
import AboutPage      from './components/AboutPage';
import IntroLoader    from './components/IntroLoader';
import Footer         from './components/Footer';
import { useCrawl }   from './hooks/useCrawl';
import { FEATURE_FLAGS } from './config/featureFlags';

// Master-level bulletproof dynamic import. Completely avoids compiler errors if the file is deleted.
const CrawlPlanner = React.lazy(() => {
  if (FEATURE_FLAGS.enableAIPlanner) {
    return import('./components/CrawlPlanner').catch(() => {
      console.warn('⚠️ CrawlPlanner component file was deleted or failed to load. Falling back gracefully.');
      return { default: () => null };
    });
  }
  return Promise.resolve({ default: () => null });
});

export default function App() {
  const [introLoading, setIntroLoading] = useState(true);
  const [url,          setUrl]          = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout,    setShowAbout]    = useState(false);
  const [settings,     setSettings]     = useState({
    depth: 3,
    assetTypes: ['html', 'css', 'js', 'images', 'fonts'],
    respectRobots: true,
    minify: false,
    mode: 'standard',
    concurrency: 5,
    requestDelay: 800
  });

  const { 
    status, logs, progress, result, error, startCrawl, reset,
    plannerStatus, plannerProgress, plannerLog, plannerReport, analyzeUrl, resetPlanner
  } = useCrawl();

  // Dynamic CSS injector (Safe to delete the CSS file)
  useEffect(() => {
    if (FEATURE_FLAGS.enableAIPlanner) {
      import('./components/CrawlPlanner.css').catch(() => {
        console.warn('⚠️ CrawlPlanner.css file was deleted or failed to load.');
      });
    }
  }, []);

  // Smooth scroll restoration when transitioning view layouts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [showAbout]);

  const handleProcess = useCallback(() => {
    if (!url.trim()) return;
    startCrawl(url.trim(), settings);
  }, [url, settings, startCrawl]);

  const handleAnalyze = useCallback(() => {
    if (!url.trim() || !FEATURE_FLAGS.enableAIPlanner) return;
    analyzeUrl(url.trim());
  }, [url, analyzeUrl]);

  const handleApplyPlannerSettings = useCallback((recommendedSettings) => {
    setSettings((prev) => ({
      ...prev,
      ...recommendedSettings,
      mode: recommendedSettings.mode,
    }));
  }, []);

  const handleStartCrawlFromPlanner = useCallback(() => {
    if (!url.trim() || !plannerReport) return;
    startCrawl(url.trim(), settings);
  }, [url, plannerReport, settings, startCrawl]);

  const handleResetAll = useCallback(() => {
    resetPlanner();
    reset();
  }, [resetPlanner, reset]);

  const isProcessing = status === 'crawling';
  const isDone       = status === 'done';
  const isIdle       = status === 'idle';

  return (
    <div className="app-wrapper">
      <AnimatePresence mode="wait">
        {introLoading ? (
          <IntroLoader key="intro-loader" onComplete={() => setIntroLoading(false)} />
        ) : (
          <motion.div
            key="app-main-content"
            className="app-content"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Header showAbout={showAbout} setShowAbout={setShowAbout} />

            <main className="main-content">
              <AnimatePresence mode="wait">
                {showAbout ? (
                  <motion.div
                    key="about-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AboutPage onBack={() => setShowAbout(false)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="crawl-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                  >
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

                          {/* Dynamic buttons row based on features toggle */}
                          {FEATURE_FLAGS.enableAIPlanner ? (
                            <div className="btn-actions-row">
                              <button
                                className="btn-planner-scan"
                                onClick={handleAnalyze}
                                disabled={!url.trim() || isProcessing || plannerStatus === 'analyzing'}
                              >
                                {plannerStatus === 'analyzing' ? (
                                  <><Loader2 className="spinner" size={16} /> Scanning…</>
                                ) : (
                                  <><Sparkles size={16} style={{ color: 'var(--accent)' }} /> AI Pre-Crawl Scan</>
                                )}
                              </button>

                              <button
                                className="btn-process"
                                onClick={handleProcess}
                                disabled={!url.trim() || isProcessing || plannerStatus === 'analyzing'}
                                style={{ marginTop: 0 }}
                              >
                                {isProcessing ? (
                                  <><Loader2 className="spinner" size={16} /> Processing…</>
                                ) : (
                                  <><Hexagon size={16} /> Grab Site</>
                                )}
                              </button>
                            </div>
                          ) : (
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
                          )}

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

                    {/* ── AI Crawl Planner (Safe Dynamic Suspense Block) ── */}
                    <Suspense fallback={null}>
                      <AnimatePresence>
                        {FEATURE_FLAGS.enableAIPlanner && plannerStatus !== 'idle' && !isProcessing && (
                          <motion.div
                            key="planner"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.4 }}
                          >
                            <CrawlPlanner
                              url={url}
                              status={plannerStatus}
                              progress={plannerProgress}
                              log={plannerLog}
                              report={plannerReport}
                              onApplySettings={handleApplyPlannerSettings}
                              onStartCrawl={handleStartCrawlFromPlanner}
                              onReset={handleResetAll}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Suspense>

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
                          <ProgressPanel logs={logs} progress={progress} url={url} mode={settings.mode} />
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
                          <ResultsPanel result={result} url={url} onReset={handleResetAll} mode={settings.mode} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <HistoryPanel onSelect={setUrl} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
