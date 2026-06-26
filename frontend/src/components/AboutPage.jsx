// components/AboutPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Cpu, 
  Terminal, 
  Database, 
  Sparkles, 
  Globe, 
  Settings, 
  ShieldCheck,
  PackageOpen,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wrench,
  Package
} from 'lucide-react';
import './AboutPage.css';

const SIMULATION_LOGS = {
  aiScanner: [
    { type: 'info', text: 'Initiating AI Crawl Planner scan for: https://example.com' },
    { type: 'info', text: 'Inspecting robots.txt guidelines...' },
    { type: 'success', text: 'Parse complete: 0 restrictions found. Path fully crawlable.' },
    { type: 'info', text: 'Analyzing homepage DOM complexity...' },
    { type: 'stats', text: '-> DOM Nodes: 1,482 (Complexity Score: Medium)' },
    { type: 'stats', text: '-> Form Controls: 2 detected' },
    { type: 'stats', text: '-> Client Scripts: Webpack / React SPA architecture detected' },
    { type: 'warning', text: 'Infinite scroll structure matched inside container .feed-wrap' },
    { type: 'success', text: 'AI recommendations computed: depth=3, connections=4, delay=250ms' },
    { type: 'success', text: 'Rate limiter bypass enabled for high-fidelity assets compilation.' }
  ],
  deepCrawl: [
    { type: 'info', text: 'Spawning Puppeteer Headless Chrome Cluster instance...' },
    { type: 'info', text: 'Navigating viewport to target viewport layout: 1920x1080' },
    { type: 'info', text: 'Executing dynamic page scroll scripts...' },
    { type: 'stats', text: '-> Scrolled 4,200px: triggered 18 lazy-loaded images' },
    { type: 'info', text: 'Preservation hook: WebGL canvas context active' },
    { type: 'success', text: 'Capture buffer generated: saving high-res snapshot to _captures/' },
    { type: 'info', text: 'Harvesting virtual routing links from window.history.state' },
    { type: 'success', text: 'Intercepted 42 network resources via Page.setRequestInterception' }
  ],
  integrity: [
    { type: 'info', text: 'Initializing Magic Signature Integrity Audits...' },
    { type: 'info', text: 'Packaging resource asset buffers...' },
    { type: 'stats', text: '-> logo.png: Match signature [89 50 4E 47] -> PNG Valid' },
    { type: 'stats', text: '-> banner.jpg: Match signature [FF D8 FF E0] -> JPEG Valid' },
    { type: 'stats', text: '-> script.js: Parse check -> ES6 syntax compilation clean' },
    { type: 'warning', text: 'soft-404 match: avatar-temp.jpg returned HTML doc -> BLOCKED' },
    { type: 'success', text: 'Validation finalized: 41 pristine files saved, 1 corrupt blocked.' }
  ],
  zipper: [
    { type: 'info', text: 'Initializing PassThrough zip compression pipeline...' },
    { type: 'info', text: 'Rewriting absolute href links to offline-compatible relative structures' },
    { type: 'stats', text: '-> Rewriting "https://example.com/assets/main.css" to "./assets/main.css"' },
    { type: 'info', text: 'Injecting lightweight HTML minification streams...' },
    { type: 'info', text: 'Appending diagnostic crawl_report.json manifest metadata' },
    { type: 'success', text: 'Compression completed: sitegrab-example.zip written successfully' },
    { type: 'success', text: 'Final payload compiled: 2.14 MB (compression ratio: 68%)' }
  ]
};

export default function AboutPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('aiScanner');
  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const terminalContentRef = useRef(null);

  // Reset scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Typewriting log simulator
  useEffect(() => {
    setDisplayedLogs([]);
    setIsTyping(true);
    let currentLine = 0;
    const lines = SIMULATION_LOGS[activeTab];

    const timer = setInterval(() => {
      if (currentLine < lines.length) {
        const nextLine = lines[currentLine];
        setDisplayedLogs(prev => [...prev, nextLine]);
        currentLine++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 350);

    return () => clearInterval(timer);
  }, [activeTab]);

  // Auto-scroll ONLY the terminal panel scrollbar (resolves window-jerk glitch completely)
  useEffect(() => {
    if (terminalContentRef.current) {
      terminalContentRef.current.scrollTop = terminalContentRef.current.scrollHeight;
    }
  }, [displayedLogs]);

  // Helper method to resolve dynamic Lucide icons for logs
  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={13} style={{ color: '#82A687', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={13} style={{ color: '#B29A7B', flexShrink: 0 }} />;
      case 'stats':
        return <Activity size={13} style={{ color: '#A5B6A8', flexShrink: 0 }} />;
      default:
        return <Cpu size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />;
    }
  };

  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 70, damping: 14 }
    }
  };

  return (
    <div className="about-container font-sans">
      <button className="btn-about-back" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Return to Crawler</span>
      </button>

      <div className="about-header">
        <motion.h1 
          className="about-title"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Behind the Screen
        </motion.h1>
        <motion.p 
          className="about-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Unveiling the intelligence and architectures powering SiteGrab Pro.
        </motion.p>
      </div>

      <motion.div>
        {/* ── Section 1: How It Works ── */}
        <motion.div 
          variants={cardVariants} 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="about-section-card glass"
        >
          <div className="section-label">
            <Cpu size={14} />
            <span>Operational Engine</span>
          </div>
          <h2 className="section-title">How SiteGrab Pro Works</h2>
          <p className="section-desc">
            We bridge the gap between heavy cloud crawlers and lightweight scrapers. By coordinating multiple async processes, SiteGrab Pro downloads, cleans, audits, and packages full domains into pristine offline-compatible local packages.
          </p>

          <div className="about-stepper">
            {[
              {
                num: '01',
                title: 'AI Pre-Crawl Scanner',
                desc: 'Profiles targets instantly, checking robots.txt, node depth limits, frame blockages, and server response speeds to plan ideal parallel settings.'
              },
              {
                num: '02',
                title: 'SPA Interpreter & Autoscrolling',
                desc: 'Puppeteer launches Headless Chrome to run React/Vue states, scrolling incrementally (400px intervals) to trigger lazy-loaded data-src images, and returning back to the top.'
              },
              {
                num: '03',
                title: 'Adaptive Concurrency Downloader',
                desc: 'Asset streams download with backoff retries and random jitter. Safe Mode drops worker concurrency to 1 upon hitting 429/403 rate limits, recovering after 10 consecutive successes.'
              },
              {
                num: '04',
                title: 'Cookie & Magic Byte Audits',
                desc: 'Extracts session cookies before closing the page to bypass auth gates. Resolves soft-404 pages via Magic Byte binary verification of buffers.'
              }
            ].map(step => (
              <div key={step.num} className="about-step">
                <div className="step-num">{step.num}</div>
                <div className="step-content">
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Section 2: Real-time Terminal Simulator ── */}
        <motion.div 
          variants={cardVariants} 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="about-section-card glass"
        >
          <div className="section-label">
            <Terminal size={14} />
            <span>Interactive Simulator</span>
          </div>
          <h2 className="section-title">System Diagnostic Console</h2>
          <p className="section-desc">
            Select a system component below to stream live simulation logs from the background crawling layers. See our algorithms intercept networking contexts in real-time.
          </p>

          <div className="terminal-box">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="terminal-dot red"></span>
                <span className="terminal-dot yellow"></span>
                <span className="terminal-dot green"></span>
              </div>
              <div className="terminal-title">sitegrab-diagnostics.sh</div>
              <div style={{ width: '40px' }}></div>
            </div>

            <div className="terminal-nav">
              {[
                { id: 'aiScanner', label: 'AI Scan', icon: Sparkles },
                { id: 'deepCrawl', label: 'Headless Chrome', icon: Globe },
                { id: 'integrity', label: 'Magic Bytes', icon: ShieldCheck },
                { id: 'zipper', label: 'Zip Compression', icon: PackageOpen }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`terminal-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={12} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="terminal-content" ref={terminalContentRef}>
              <AnimatePresence mode="popLayout">
                {displayedLogs.map((log, idx) => (
                  <motion.div
                    key={idx}
                    className="terminal-line"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: log.type === 'success' ? '#82A687' : 
                             log.type === 'warning' ? '#B29A7B' : 
                             log.type === 'error' ? '#9E4B4B' : '#E2D9CB'
                    }}
                  >
                    {getLogIcon(log.type)}
                    <span>{log.text}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isTyping && <span className="terminal-cursor"></span>}
            </div>
          </div>
        </motion.div>

        {/* ── Section 3: Tech Stack & Architecture ── */}
        <motion.div 
          variants={cardVariants} 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="about-section-card glass"
        >
          <div className="section-label">
            <Database size={14} />
            <span>Architecture & Languages</span>
          </div>
          <h2 className="section-title">Core Technology Stack</h2>
          <p className="section-desc">
            We run high-concurrency Node systems paired with modern React renderers. Below is a breakdown of languages and libraries powering the core pipelines:
          </p>

          <div className="tech-grid">
            <div className="tech-column">
              <h4 className="tech-col-title">Frontend Layers</h4>
              <div className="tech-pills">
                <span className="tech-pill">React.js</span>
                <span className="tech-pill">ES6+</span>
                <span className="tech-pill">Vanilla CSS</span>
                <span className="tech-pill">Framer Motion</span>
                <span className="tech-pill">Lucide Icons</span>
              </div>
            </div>

            <div className="tech-column">
              <h4 className="tech-col-title">Crawler Core</h4>
              <div className="tech-pills">
                <span className="tech-pill">Node.js</span>
                <span className="tech-pill">Express</span>
                <span className="tech-pill">Puppeteer</span>
                <span className="tech-pill">Cheerio</span>
                <span className="tech-pill">Axios</span>
              </div>
            </div>

            <div className="tech-column">
              <h4 className="tech-col-title">Pipelines</h4>
              <div className="tech-pills">
                <span className="tech-pill">Archiver</span>
                <span className="tech-pill">UUID</span>
                <span className="tech-pill">Concurrently</span>
                <span className="tech-pill">FS-Extra</span>
                <span className="tech-pill">MIME-Types</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Section 4: Deep Scraper Logic Details ── */}
        <motion.div 
          variants={cardVariants} 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="about-section-card glass"
        >
          <div className="section-label">
            <Settings size={14} />
            <span>Advanced Systems Logic</span>
          </div>
          <h2 className="section-title">Link Transformation Algorithms</h2>
          <p className="section-desc">
            A standard scraper simply copies markup, which immediately breaks offline because resource links still point to external domains. SiteGrab Pro implements:
          </p>

           <div className="algo-list">
            <div className="algo-item">
              <div className="algo-icon-wrapper"><Layers size={16} /></div>
              <div className="algo-text">
                <strong>Breadth-First URL Queues</strong>: Crawling proceeds in concentric BFS layers, preserving sub-directory levels and ensuring we crawl the most important content first.
              </div>
            </div>
            <div className="algo-item">
              <div className="algo-icon-wrapper"><Wrench size={16} /></div>
              <div className="algo-text">
                <strong>Local Refactoring</strong>: Scans and translates relative reference anchors. Links pointing to external subdirectories are mapped onto clean static local folders such as <code>_captures/</code> and <code>assets/</code>.
              </div>
            </div>
            <div className="algo-item">
              <div className="algo-icon-wrapper"><Package size={16} /></div>
              <div className="algo-text">
                <strong>MIME Sniffing Fallback</strong>: When servers deliver incorrect Content-Type headers, the downloader executes magic-byte signature validation on binary chunk buffers.
              </div>
            </div>
            <div className="algo-item">
              <div className="algo-icon-wrapper"><Globe size={16} /></div>
              <div className="algo-text">
                <strong>CDN Whitelisting & Tracker Silencing</strong>: Evaluates external links to download structural assets (CSS/JS/fonts) from whitelisted CDNs, while automatically silencing tracking scripts and ad networks to prevent bloat.
              </div>
            </div>
            <div className="algo-item">
              <div className="algo-icon-wrapper"><ShieldCheck size={16} /></div>
              <div className="algo-text">
                <strong>Active Session Cookie Passthrough</strong>: Dynamically grabs active session cookies from Puppeteer prior to page closure and maps them to download request headers to securely bypass authentication walls.
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
