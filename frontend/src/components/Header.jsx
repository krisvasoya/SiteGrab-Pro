// components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Sun, Moon, Code2 } from 'lucide-react';
import Logo from './Logo';
import './Header.css';

export default function Header() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sitegrab-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sitegrab-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className="site-header glass">
      <div className="header-inner">
        <div className="header-logo">
          <Logo className="logo-icon" size={32} />
          <span className="logo-text">SiteGrab <strong>Pro</strong></span>
        </div>

        <nav className="header-nav">
          <a
            href="https://github.com/krisvasoya"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            <Code2 size={18} />
            <span>Source</span>
          </a>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </div>
    </header>
  );
}
