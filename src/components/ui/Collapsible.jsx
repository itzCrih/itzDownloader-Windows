import React, { useEffect, useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Height-animated disclosure region. Uses the grid-template-rows 0fr -> 1fr
 * technique, so it animates to the content's natural height without any
 * measuring and without layout thrash. Closed content is made `inert` so it
 * cannot receive focus.
 */
export function Collapsible({ open, children, id, className = '' }) {
  const innerRef = useRef(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (open) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [open]);

  return (
    <div id={id} className={`ui-collapse ${open ? 'is-open' : ''} ${className}`}>
      <div ref={innerRef} className="ui-collapse-inner">
        <div className="ui-collapse-content">{children}</div>
      </div>
    </div>
  );
}

/**
 * Card with a clickable header that expands/collapses its body.
 */
export function CollapsibleCard({
  open,
  onToggle,
  icon,
  title,
  subtitle,
  badge,
  children,
  className = '',
}) {
  const bodyId = useId();
  return (
    <div className={`studio-card ui-collapsible-card ${open ? 'is-open' : ''} ${className}`}>
      <button
        type="button"
        className="ui-collapsible-header"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => onToggle?.(!open)}
      >
        <span className="card-title-group">
          {icon}
          <span className="ui-collapsible-titles">
            <span className="card-title">{title}</span>
            {subtitle && <span className="ui-collapsible-subtitle">{subtitle}</span>}
          </span>
        </span>
        <span className="ui-collapsible-right">
          {badge}
          <span className="ui-collapsible-chevron" aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </span>
      </button>
      <Collapsible open={open} id={bodyId}>
        <div className="ui-collapsible-body">{children}</div>
      </Collapsible>
    </div>
  );
}

export default Collapsible;
