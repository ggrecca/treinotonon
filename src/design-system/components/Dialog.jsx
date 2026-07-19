import React, {useEffect, useId, useRef, useState} from "react";
import {createPortal} from "react-dom";

const FOCUSABLE_SELECTOR = ["button:not([disabled])", "input:not([disabled])", "select:not([disabled])", "textarea:not([disabled])", "a[href]", "[tabindex]:not([tabindex='-1'])"].join(",");
let scrollLockCount = 0;
let previousBodyOverflow = "";

function focusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(element => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true" && element.tabIndex >= 0);
}

function lockDocumentScroll() {
  if (scrollLockCount === 0) previousBodyOverflow = document.body.style.overflow;
  scrollLockCount += 1;
  document.body.style.overflow = "hidden";
}

function unlockDocumentScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = previousBodyOverflow;
}

export function canDismissDialog({pending = false, dismissible = true} = {}) {
  return !pending && dismissible !== false;
}

export function Dialog({open, title, description, children, actions, onClose, labelledBy, describedBy, className = "", backdropClassName = "", contentClassName = "", variant = "normal", size = "md", role, pending = false, dismissible = true, closeOnEscape = true, closeOnBackdrop = true, showClose = true, closeIcon, initialFocus, portal = true, formId, onSubmit}) {
  const generatedId = useId().replace(/:/g, "");
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const titleId = labelledBy || `tt-dialog-title-${generatedId}`;
  const descriptionId = describedBy || `tt-dialog-description-${generatedId}`;
  const canDismiss = canDismissDialog({pending, dismissible});
  const dialogRole = role || (variant === "danger" ? "alertdialog" : "dialog");

  useEffect(() => { if (typeof document !== "undefined") setPortalTarget(document.body); }, []);
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previouslyFocused = document.activeElement;
    lockDocumentScroll();
    const focusTimer = setTimeout(() => {
      const target = initialFocus?.current || (typeof initialFocus === "string" ? dialogRef.current?.querySelector(initialFocus) : null) || closeRef.current || focusableElements(dialogRef.current)[0] || dialogRef.current;
      target?.focus?.();
    }, 0);
    return () => {
      clearTimeout(focusTimer);
      unlockDocumentScroll();
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
    };
  }, [initialFocus, open]);

  if (!open) return null;
  const requestClose = () => { if (canDismiss) onClose?.(); };
  const handleKeyDown = event => {
    if (event.key === "Escape" && closeOnEscape && canDismiss) {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
      return;
    }
    if (event.key !== "Tab") return;
    const elements = focusableElements(dialogRef.current);
    if (!elements.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    const activeElement = document.activeElement;
    if (event.shiftKey && (activeElement === first || !dialogRef.current?.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || !dialogRef.current?.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };
  const dialogContents = <>{description && <p id={descriptionId} className="tt-dialog__description">{description}</p>}{children && <div className={`tt-dialog__content ${contentClassName}`.trim()}>{children}</div>}{actions && <footer className="tt-dialog__actions">{actions}</footer>}</>;
  const dialog = <div className={`tt-dialog-backdrop ${backdropClassName}`.trim()} role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget && closeOnBackdrop) requestClose();
  }}>
    <section ref={dialogRef} className={`tt-dialog tt-dialog--${size} ${variant === "danger" ? "tt-dialog--danger" : ""} ${className}`.trim()} role={dialogRole} aria-modal="true" aria-labelledby={title ? titleId : labelledBy} aria-describedby={description ? descriptionId : describedBy} aria-busy={pending || undefined} tabIndex={-1} onKeyDown={handleKeyDown}>
      {(title || (showClose && onClose)) && <header className="tt-dialog__header">{title && <h2 id={titleId} className="tt-dialog__title">{title}</h2>}{showClose && onClose && <button ref={closeRef} type="button" className="tt-button tt-button--ghost tt-button--sm tt-dialog__close" onClick={requestClose} disabled={!canDismiss} aria-label="Fechar diálogo">{closeIcon || "×"}</button>}</header>}
      {onSubmit ? <form id={formId} className="tt-dialog__form" onSubmit={onSubmit}>{dialogContents}</form> : dialogContents}
    </section>
  </div>;
  return portal && portalTarget ? createPortal(dialog, portalTarget) : dialog;
}
