import React from 'react';

/**
 * iOS-style switch backed by a native checkbox (role="switch").
 */
export default function Toggle({ checked, onChange, disabled = false, ariaLabel }) {
  return (
    <label className={`ui-toggle ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        className="ui-visually-hidden"
        checked={!!checked}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="ui-toggle-track" aria-hidden="true">
        <span className="ui-toggle-thumb" />
      </span>
    </label>
  );
}
