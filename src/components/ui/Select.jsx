import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 300;
const EXIT_MS = 120;

/**
 * Accessible custom dropdown.
 * - Rendered in a portal with fixed positioning so it is never clipped by
 *   collapsible panels or scroll containers, and flips upward near the bottom.
 * - Full keyboard support: arrows, Home/End, Enter/Space, Escape, type-ahead.
 *
 * options: [{ value, label, hint?, icon? }]
 */
export default function Select({
  value,
  onChange,
  options = [],
  size = 'md',
  disabled = false,
  placeholder = 'Select…',
  ariaLabel,
  id,
  className = '',
  minMenuWidth,
}) {
  const reactId = useId();
  const listId = `${id || reactId}-listbox`;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const typeAheadRef = useRef({ text: '', timer: null });
  const closeTimerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState(null);

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - 8;
    const spaceAbove = rect.top - MENU_GAP - 8;
    const estimated = Math.min(MENU_MAX_HEIGHT, options.length * 40 + 12);
    const placeAbove = spaceBelow < estimated && spaceAbove > spaceBelow;
    const width = Math.max(rect.width, minMenuWidth || 0);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPosition({
      left: Math.max(8, left),
      width,
      top: placeAbove ? undefined : rect.bottom + MENU_GAP,
      bottom: placeAbove ? window.innerHeight - rect.top + MENU_GAP : undefined,
      maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, placeAbove ? spaceAbove : spaceBelow)),
      placeAbove,
    });
  }, [options.length, minMenuWidth]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    window.clearTimeout(closeTimerRef.current);
    computePosition();
    setClosing(false);
    setOpen(true);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [disabled, computePosition, selectedIndex]);

  const closeMenu = useCallback((focusTrigger = true) => {
    setClosing(true);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, EXIT_MS);
    if (focusTrigger) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const commit = useCallback((index) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    if (String(opt.value) !== String(value)) onChange?.(opt.value);
    closeMenu();
  }, [options, value, onChange, closeMenu]);

  useEffect(() => () => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(typeAheadRef.current.timer);
  }, []);

  // Outside click / scroll / resize closes the menu
  useEffect(() => {
    if (!open || closing) return undefined;
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      closeMenu(false);
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      closeMenu(false);
    };
    const onResize = () => closeMenu(false);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, closing, closeMenu]);

  // Keep the highlighted option visible
  useLayoutEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = menuRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const moveActive = (delta) => {
    if (options.length === 0) return;
    let next = activeIndex;
    for (let i = 0; i < options.length; i++) {
      next = (next + delta + options.length) % options.length;
      if (!options[next].disabled) break;
    }
    setActiveIndex(next);
  };

  const handleTypeAhead = (key) => {
    const state = typeAheadRef.current;
    window.clearTimeout(state.timer);
    state.text += key.toLowerCase();
    state.timer = window.setTimeout(() => { state.text = ''; }, 600);
    const idx = options.findIndex((o) => String(o.label).toLowerCase().startsWith(state.text));
    if (idx >= 0) {
      if (open) setActiveIndex(idx);
      else if (String(options[idx].value) !== String(value)) onChange?.(options[idx].value);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openMenu(); else moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openMenu(); else moveActive(-1);
        break;
      case 'Home':
        if (open) { e.preventDefault(); setActiveIndex(0); }
        break;
      case 'End':
        if (open) { e.preventDefault(); setActiveIndex(options.length - 1); }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) commit(activeIndex); else openMenu();
        break;
      case 'Escape':
        if (open) { e.preventDefault(); e.stopPropagation(); closeMenu(); }
        break;
      case 'Tab':
        if (open) closeMenu(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) handleTypeAhead(e.key);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`ui-select ui-select-${size} ${open && !closing ? 'is-open' : ''} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open && !closing}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span className="ui-select-value">
          {selected?.icon && <span className="ui-select-icon">{selected.icon}</span>}
          <span className={selected ? '' : 'ui-select-placeholder'}>{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown size={15} className="ui-select-chevron" aria-hidden="true" />
      </button>

      {open && position && createPortal(
        <ul
          ref={menuRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          className={`ui-select-menu ${position.placeAbove ? 'from-bottom' : 'from-top'} ${closing ? 'is-closing' : ''}`}
          style={{
            left: position.left,
            top: position.top,
            bottom: position.bottom,
            minWidth: position.width,
            maxHeight: position.maxHeight,
          }}
          onKeyDown={handleKeyDown}
        >
          {options.map((opt, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <li
                key={String(opt.value)}
                role="option"
                data-index={idx}
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                className={`ui-select-option ${idx === activeIndex ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''} ${opt.disabled ? 'is-disabled' : ''}`}
                onPointerEnter={() => setActiveIndex(idx)}
                onClick={() => commit(idx)}
              >
                {opt.icon && <span className="ui-select-icon">{opt.icon}</span>}
                <span className="ui-select-option-text">
                  <span className="ui-select-option-label">{opt.label}</span>
                  {opt.hint && <span className="ui-select-option-hint">{opt.hint}</span>}
                </span>
                <Check size={14} className="ui-select-check" aria-hidden="true" />
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </>
  );
}
