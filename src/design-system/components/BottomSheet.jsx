import React, {useEffect, useId, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {canDismissOverlay, focusableElements, lockDocumentScroll, unlockDocumentScroll} from "./overlayUtils";

export function canDismissBottomSheet({pending = false, dismissible = true} = {}) {
  return canDismissOverlay({pending, dismissible});
}

export function BottomSheet({open, title, description, children, actions, onClose, labelledBy, describedBy, className = "", backdropClassName = "", contentClassName = "", size = "md", role = "dialog", pending = false, dismissible = true, closeOnEscape = true, closeOnBackdrop = true, showClose = true, showHandle = true, closeIcon, initialFocus, portal = true}) {
  const generatedId = useId().replace(/:/g, "");
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const [rendered, setRendered] = useState(Boolean(open));
  const [visible, setVisible] = useState(Boolean(open));
  const titleId = labelledBy || `tt-bottom-sheet-title-${generatedId}`;
  const descriptionId = describedBy || `tt-bottom-sheet-description-${generatedId}`;
  const canDismiss = canDismissBottomSheet({pending, dismissible});

  useEffect(() => { if (typeof document !== "undefined") setPortalTarget(document.body); }, []);
  useEffect(() => {
    if (open) {
      setRendered(true);
      const frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => setVisible(true)) : setTimeout(() => setVisible(true), 0);
      return () => { if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame); else clearTimeout(frame); };
    }
    setVisible(false);
    const timer = setTimeout(() => setRendered(false), 180);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previouslyFocused = document.activeElement;
    lockDocumentScroll();
    const focusTimer = setTimeout(() => {
      const target = initialFocus?.current || (typeof initialFocus === "string" ? sheetRef.current?.querySelector(initialFocus) : null) || closeRef.current || focusableElements(sheetRef.current)[0] || sheetRef.current;
      target?.focus?.();
    }, 0);
    return () => {
      clearTimeout(focusTimer);
      unlockDocumentScroll();
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
    };
  }, [initialFocus, open]);
  if (!rendered) return null;

  const requestClose = () => { if (canDismiss) onClose?.(); };
  const handleKeyDown = event => {
    if (event.key === "Escape" && closeOnEscape && canDismiss) {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
      return;
    }
    if (event.key !== "Tab") return;
    const elements = focusableElements(sheetRef.current);
    if (!elements.length) {
      event.preventDefault();
      sheetRef.current?.focus();
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    const activeElement = document.activeElement;
    if (event.shiftKey && (activeElement === first || !sheetRef.current?.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !sheetRef.current?.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };
  const sheet = <div className={`tt-bottom-sheet-backdrop ${visible ? "tt-bottom-sheet-backdrop--open" : "tt-bottom-sheet-backdrop--closing"} ${backdropClassName}`.trim()} role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget && closeOnBackdrop) requestClose();
  }}>
    <section ref={sheetRef} className={`tt-bottom-sheet tt-bottom-sheet--${size} ${visible ? "tt-bottom-sheet--open" : "tt-bottom-sheet--closing"} ${className}`.trim()} role={role} aria-modal="true" aria-labelledby={title ? titleId : labelledBy} aria-describedby={description ? descriptionId : describedBy} aria-busy={pending || undefined} tabIndex={-1} onKeyDown={handleKeyDown}>
      {showHandle && <div className="tt-bottom-sheet__handle" aria-hidden="true" />}
      {(title || (showClose && onClose)) && <header className="tt-bottom-sheet__header">{title && <h2 id={titleId} className="tt-bottom-sheet__title">{title}</h2>}{showClose && onClose && <button ref={closeRef} type="button" className="tt-button tt-button--ghost tt-button--sm tt-bottom-sheet__close" onClick={requestClose} disabled={!canDismiss} aria-label="Fechar painel">{closeIcon || "×"}</button>}</header>}
      {description && <p id={descriptionId} className="tt-bottom-sheet__description">{description}</p>}
      {children && <div className={`tt-bottom-sheet__content ${contentClassName}`.trim()}>{children}</div>}
      {actions && <footer className="tt-bottom-sheet__actions">{actions}</footer>}
    </section>
  </div>;
  return portal && portalTarget ? createPortal(sheet, portalTarget) : sheet;
}
