// components/URLInput.jsx
import React, { useState } from 'react';
import { Globe, X, Check } from 'lucide-react';
import './URLInput.css';

function isValidUrl(str) {
  try {
    const url = new URL(str.startsWith('http') ? str : `https://${str}`);
    return url.hostname.includes('.');
  } catch { return false; }
}

export default function URLInput({ value, onChange, onSubmit, disabled }) {
  const [touched, setTouched] = useState(false);

  const valid    = isValidUrl(value);
  const showErr  = touched && value && !valid;

  const handleKey = (e) => {
    if (e.key === 'Enter' && valid && !disabled) onSubmit();
  };

  return (
    <div className="url-input-wrap">
      <label className="url-label" htmlFor="url-field">
        Enter Website URL
      </label>

      <div className={`url-field-row ${showErr ? 'has-error' : ''} ${valid && touched ? 'has-valid' : ''}`}>
        <Globe size={18} className="url-icon text-muted" />

        <input
          id="url-field"
          type="text"
          className="url-input"
          value={value}
          onChange={(e) => { onChange(e.target.value); setTouched(true); }}
          onKeyDown={handleKey}
          onBlur={() => setTouched(true)}
          placeholder="https://example.com"
          disabled={disabled}
          autoComplete="url"
          spellCheck="false"
        />

        {value && (
          <button
            className="url-clear"
            onClick={() => { onChange(''); setTouched(false); }}
            title="Clear"
            disabled={disabled}
            aria-label="Clear URL"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showErr && (
        <p className="url-hint url-hint--error">
          Please enter a valid URL (e.g. https://example.com)
        </p>
      )}
      {valid && touched && (
        <p className="url-hint url-hint--ok">
          <Check size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          URL looks good — ready to grab
        </p>
      )}
    </div>
  );
}
