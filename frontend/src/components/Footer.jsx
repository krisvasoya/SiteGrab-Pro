// components/Footer.jsx
import React from 'react';
import { AlertTriangle, Heart, Code2 } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-disclaimer">
          <AlertTriangle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          SiteGrab Pro is intended for <strong>educational and personal research use only</strong>.
          Always respect website Terms of Service, copyright law, and robots.txt rules.
          You accept full responsibility for how you use this tool.
        </p>
        <div className="footer-credits">
          <span>
            <Code2 size={12} style={{ marginRight: '6px' }} />
            Built with React · Node.js · Puppeteer
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Made with <Heart size={12} className="text-error" fill="currentColor" /> by Krish
          </span>
          <span className="footer-version">v1.0</span>
        </div>
      </div>
    </footer>
  );
}
