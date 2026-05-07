// components/HeroSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Box, Palette, Sparkles } from 'lucide-react';
import './HeroSection.css';

export default function HeroSection() {
  return (
    <motion.section
      className="hero"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="hero-badge">
        <Sparkles size={14} className="text-accent" />
        Website Frontend Asset Downloader
      </div>
      <h1 className="hero-title">
        Capture Every Pixel.<br />
        <span className="hero-accent">Download the Web.</span>
      </h1>
      <p className="hero-sub">
        Input any public URL — SiteGrab Pro crawls every page, collects all assets,
        and packages them into one clean ZIP. No DevTools. No manual work.
      </p>

      <div className="hero-stats">
        {[
          { icon: <Zap size={18} />, label: 'Under 2 min',  sub: 'Most sites' },
          { icon: <Box size={18} />, label: 'Full ZIP',      sub: 'Original structure' },
          { icon: <Palette size={18} />, label: '14+ asset types', sub: 'CSS, JS, Fonts, 3D…' },
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
    </motion.section>
  );
}
