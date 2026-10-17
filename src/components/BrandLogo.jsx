import React from 'react';
import { ArrowDownToLine } from 'lucide-react';

export default function BrandLogo({ onClick, size = 'default' }) {
  return (
    <div
      className="brand-logo-container"
      onClick={onClick}
      title={onClick ? 'Reset application & return to Home' : undefined}
    >
      {/* Golden rounded rectangle with download icon */}
      <div
        className="brand-icon-rounded-box"
        style={{
          width: size === 'small' ? '28px' : '34px',
          height: size === 'small' ? '28px' : '34px',
          borderRadius: '9px',
          border: '1.5px solid #e6b422',
          background: 'linear-gradient(135deg, rgba(230, 180, 34, 0.16) 0%, rgba(14, 18, 26, 0.85) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e6b422',
          flexShrink: 0,
        }}
      >
        <ArrowDownToLine className="brand-download-icon" size={size === 'small' ? 14 : 17} strokeWidth={2.4} />
      </div>

      {/* Animated Gradient itzDownloader Typography */}
      <div
        className="brand-logo-text"
        style={{
          fontSize: size === 'small' ? '17px' : '20px',
        }}
      >
        itzDownloader
      </div>
    </div>
  );
}
