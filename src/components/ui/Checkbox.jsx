import React from 'react';

/**
 * Custom animated checkbox. Keeps a real (visually hidden) native input so
 * keyboard focus, Space toggling and screen readers keep working.
 */
export default function Checkbox({ checked, onChange, label, hint, disabled = false, className = '' }) {
  return (
    <label className={`ui-checkbox ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}>
      <input
        type="checkbox"
        className="ui-visually-hidden"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="ui-checkbox-box" aria-hidden="true">
        <svg viewBox="0 0 16 16" className="ui-checkbox-mark">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </span>
      {(label || hint) && (
        <span className="ui-checkbox-text">
          {label && <span className="ui-checkbox-label">{label}</span>}
          {hint && <span className="ui-checkbox-hint">{hint}</span>}
        </span>
      )}
    </label>
  );
}
