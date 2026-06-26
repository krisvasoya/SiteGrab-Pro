// components/HeroSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Box, Palette, Sparkles, Cpu, Scroll, Globe, Shield } from 'lucide-react';
import {
  SplitText,
  GlitchText,
  RevealBlock,
  ParallaxSection,
  CountUp,
} from './ScrollAnimations';
import './HeroSection.css';
import './ScrollAnimations.css';

const FEATURES = [
  {
    icon: <Scroll size={22} />,
    title: 'Smart Autoscrolling',
    desc: 'Progressive 400px scrolls trigger lazy-loaded images, deferred stylesheets, and animations — invisibly and perfectly.',
    accent: '#E76F51',
    stat: 400,
    statSuffix: 'px',
    statLabel: 'scroll step',
  },
  {
    icon: <Cpu size={22} />,
    title: 'Adaptive Concurrency',
    desc: 'Enters "Safe Mode" on 429/403 rate limits, drops workers to 1, and applies exponential backoff with random jitter retries.',
    accent: '#2A9D8F',
    stat: 10,
    statSuffix: 'x',
    statLabel: 'recovery streak',
  },
  {
    icon: <Globe size={22} />,
    title: 'CDN Whitelist Engine',
    desc: 'Retrieves structural fonts, sheets, and scripts from public CDNs while silently discarding analytics to keep archives lean.',
    accent: '#C9A84C',
    stat: 30,
    statSuffix: '+',
    statLabel: 'CDN hosts mapped',
  },
  {
    icon: <Shield size={22} />,
    title: 'Cookie Passthrough',
    desc: "Captures live Puppeteer session cookies before page close — auth-gated assets download as if you're logged in.",
    accent: '#457B9D',
    stat: 100,
    statSuffix: '%',
    statLabel: 'auth coverage',
  },
];

export default function HeroSection() {
  return (
    <section className="hero">
      {/* ── Badge ── */}
      <motion.div
        className="hero-badge"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <Sparkles size={13} className="text-accent" />
        <span>SiteGrab Pro · Next-Gen Resilient Asset Scraper</span>
      </motion.div>

      {/* ── Main Headline — SplitText per-word ── */}
      <h1 className="hero-title">
        <SplitText text="Capture Every Pixel." delay={0.05} />
        <br />
        <span className="hero-accent">
          <SplitText text="Download the Web Offline." delay={0.28} />
        </span>
      </h1>

      {/* ── Sub headline — RevealBlock ── */}
      <RevealBlock delay={0.45}>
        <p className="hero-sub">
          An advanced, self-healing offline crawler powered by headless browser
          interpreters, adaptive concurrency rate-limiting, and binary magic-byte
          integrity validations.
        </p>
      </RevealBlock>

      {/* ── Stat chips ── */}
      <RevealBlock delay={0.55}>
        <div className="hero-stats">
          {[
            { icon: <Zap size={18} />, label: 'Dynamic SPA Rendering',   sub: 'React, Vue, & Angular ready' },
            { icon: <Box size={18} />, label: 'Offline Relative Trees',   sub: 'Packages structural resources' },
            { icon: <Palette size={18} />, label: '14+ Asset Classes',   sub: 'CSS, JS, Fonts, 3D, & Canvas' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="stat-chip glass-light">
              <span className="stat-icon">{icon}</span>
              <div>
                <div className="stat-label">{label}</div>
                <div className="stat-sub">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </RevealBlock>

      {/* ── Features Grid — each card is a ParallaxSection + RevealBlock ── */}
      <div className="features-showcase">
        <RevealBlock delay={0.1}>
          <div className="showcase-divider" />
          <h2 className="showcase-title">
            <GlitchText text="Engineered for a 0% Asset Failure Rate" />
          </h2>
          <p className="showcase-subtitle">
            Four built-in subsystems that bypass classic scraper restrictions automatically.
          </p>
        </RevealBlock>

        <div className="showcase-grid">
          {FEATURES.map((feat, idx) => (
            <ParallaxSection key={idx} strength={0.08}>
              <RevealBlock delay={idx * 0.12}>
                <div className="feat-card glass">
                  <div
                    className="feat-card-glow"
                    style={{ '--glow-color': feat.accent }}
                  />

                  <div
                    className="feat-icon-container"
                    style={{ background: `${feat.accent}18`, color: feat.accent }}
                  >
                    {feat.icon}
                  </div>

                  <h4 className="feat-title">{feat.title}</h4>
                  <p className="feat-desc">{feat.desc}</p>

                  {/* Live counting stat */}
                  <div className="feat-stat">
                    <span
                      className="feat-stat-num font-mono"
                      style={{ color: feat.accent }}
                    >
                      <CountUp
                        target={feat.stat}
                        suffix={feat.statSuffix}
                        duration={1.4}
                      />
                    </span>
                    <span className="feat-stat-label">{feat.statLabel}</span>
                  </div>
                </div>
              </RevealBlock>
            </ParallaxSection>
          ))}
        </div>
      </div>
    </section>
  );
}
