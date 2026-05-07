// components/HistoryPanel.jsx
import React, { useState, useEffect } from 'react';
import { Link2, Clock, Trash2 } from 'lucide-react';
import './HistoryPanel.css';

const STORAGE_KEY = 'sitegrab_history';
const MAX_ITEMS   = 10;

export function addToHistory(url) {
  try {
    const raw   = localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    const next  = [{ url, ts: Date.now() }, ...items.filter((i) => i.url !== url)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export default function HistoryPanel({ onSelect }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  };

  if (!items.length) return null;

  return (
    <div className="glass card history-card">
      <div className="history-header">
        <h4 className="history-title">
          <Clock size={16} style={{ marginRight: '8px' }} />
          Recent Crawls
        </h4>
        <button className="history-clear" onClick={clear}>
          <Trash2 size={14} style={{ marginRight: '4px' }} />
          Clear
        </button>
      </div>
      <ul className="history-list">
        {items.map(({ url, ts }) => (
          <li key={url} className="history-item" onClick={() => onSelect(url)}>
            <Link2 size={14} className="history-icon" />
            <span className="history-url font-mono">{url}</span>
            <span className="history-time">{timeAgo(ts)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60)   return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
