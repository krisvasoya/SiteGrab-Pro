// components/SettingsPanel.jsx
import React from 'react';
import { 
  FileText, Palette, Zap, Image, Type, 
  Video, Music, Box, Cpu, Minus, Plus 
} from 'lucide-react';
import './SettingsPanel.css';

const ASSET_TYPES = [
  { id: 'html',    label: 'HTML',    icon: <FileText size={14} /> },
  { id: 'css',     label: 'CSS',     icon: <Palette size={14} /> },
  { id: 'js',      label: 'JS',      icon: <Zap size={14} /> },
  { id: 'images',  label: 'Images',  icon: <Image size={14} /> },
  { id: 'fonts',   label: 'Fonts',   icon: <Type size={14} /> },
  { id: 'video',   label: 'Video',   icon: <Video size={14} /> },
  { id: 'audio',   label: 'Audio',   icon: <Music size={14} /> },
  { id: 'models',  label: '3D Models', icon: <Box size={14} /> },
  { id: 'wasm',    label: 'WASM',    icon: <Cpu size={14} /> },
];

export default function SettingsPanel({ settings, onChange }) {
  const set = (key, val) => onChange({ ...settings, [key]: val });

  const toggleAsset = (id) => {
    const next = settings.assetTypes.includes(id)
      ? settings.assetTypes.filter((t) => t !== id)
      : [...settings.assetTypes, id];
    set('assetTypes', next);
  };

  return (
    <div className="settings-panel">
      <div className="settings-divider" />

      {/* Crawl Depth */}
      <div className="setting-row">
        <div className="setting-label-group">
          <label className="setting-label">Crawl Depth</label>
          <span className="setting-sub">How many link levels deep to follow</span>
        </div>
        <div className="depth-control">
          <button onClick={() => set('depth', Math.max(1, settings.depth - 1))} className="depth-btn">
            <Minus size={14} />
          </button>
          <span className="depth-value">{settings.depth}</span>
          <button onClick={() => set('depth', Math.min(10, settings.depth + 1))} className="depth-btn">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Asset Types */}
      <div className="setting-col">
        <label className="setting-label">Asset Types</label>
        <div className="asset-grid">
          {ASSET_TYPES.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`asset-chip ${settings.assetTypes.includes(id) ? 'active' : ''}`}
              onClick={() => toggleAsset(id)}
            >
              <span className="asset-chip-icon">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="setting-row">
        <div className="setting-label-group">
          <label className="setting-label">Respect robots.txt</label>
          <span className="setting-sub">Honour the site's crawl rules</span>
        </div>
        <Toggle checked={settings.respectRobots} onChange={(v) => set('respectRobots', v)} />
      </div>

      <div className="setting-row">
        <div className="setting-label-group">
          <label className="setting-label">Minify on download</label>
          <span className="setting-sub">Compress CSS &amp; JS in the ZIP</span>
        </div>
        <Toggle checked={settings.minify} onChange={(v) => set('minify', v)} />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
