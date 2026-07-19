import React, {useEffect, useId, useRef, useState} from "react";
import {Input} from "../design-system";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function dialogVariant(dialog) {
  const variant = dialog?.variant || dialog?.type || "notice";
  return ["notice", "confirm", "danger", "input"].includes(variant) ? variant : "notice";
}

function defaultConfirmLabel(variant) {
  if(variant === "notice") return "Entendi";
  if(variant === "danger") return "Confirmar";
  return "Continuar";
}

function focusableElements(container) {
  if(!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(element => (
    element.getAttribute("aria-hidden") !== "true"
    && !element.hasAttribute("hidden")
    && element.tabIndex >= 0
  ));
}

export function AppDialog({dialog, onResolve}) {
  const generatedId = useId().replace(/:/g, "");
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const open = Boolean(dialog);
  const variant = dialogVariant(dialog);
  const titleId = `app-dialog-title-${generatedId}`;
  const descriptionId = `app-dialog-description-${generatedId}`;
  const inputId = `app-dialog-input-${generatedId}`;

  useEffect(() => {
    setInputValue(String(dialog?.defaultValue ?? dialog?.value ?? ""));
  }, [dialog]);

  useEffect(() => {
    if(!open || typeof document === "undefined") return undefined;
    const previouslyFocused = document.activeElement;

    return () => {
      if(previouslyFocused && previouslyFocused.isConnected && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if(!open) return undefined;
    const focusInitialElement = () => {
      const preferredFocus = dialog?.initialFocus;
      if(preferredFocus === "cancel" && cancelRef.current) cancelRef.current.focus();
      else if(preferredFocus === "confirm" && confirmRef.current) confirmRef.current.focus();
      else if(variant === "input" && inputRef.current) inputRef.current.focus();
      else if(variant === "danger" && cancelRef.current) cancelRef.current.focus();
      else if(confirmRef.current) confirmRef.current.focus();
      else focusableElements(dialogRef.current)[0]?.focus();
    };
    const timer = setTimeout(focusInitialElement, 0);
    return () => clearTimeout(timer);
  }, [dialog, open, variant]);

  if(!dialog) return null;

  const description = dialog.description ?? dialog.message;
  const title = dialog.title || (variant === "danger" ? "Confirmar ação" : "Aviso");
  const showCancel = variant !== "notice" && dialog.showCancel !== false;
  const pending = Boolean(dialog.pending);
  const inputProps = dialog.inputProps || {};

  function resolve(result) {
    if(typeof onResolve === "function") onResolve(result);
  }

  function confirmDialog() {
    if(variant === "input") resolve(inputValue);
    else resolve(true);
  }

  function cancelDialog() {
    resolve(variant === "input" ? null : false);
  }

  function handleKeyDown(event) {
    if(event.key === "Escape" && dialog.dismissible !== false && !pending) {
      event.preventDefault();
      event.stopPropagation();
      cancelDialog();
      return;
    }

    if(event.key !== "Tab") return;
    const elements = focusableElements(dialogRef.current);
    if(elements.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const activeElement = document.activeElement;
    if(event.shiftKey && (activeElement === first || !dialogRef.current?.contains(activeElement))) {
      event.preventDefault();
      last.focus();
    } else if(!event.shiftKey && (activeElement === last || !dialogRef.current?.contains(activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleBackdrop(event) {
    if(event.target === event.currentTarget && dialog.closeOnBackdrop && dialog.dismissible !== false && !pending) {
      cancelDialog();
    }
  }

  return <div className={`modal appDialogOverlay appDialog-${variant}`} role="presentation" onMouseDown={handleBackdrop}>
    <form
      ref={dialogRef}
      className={`modalCard appDialogCard ${dialog.className || ""}`.trim()}
      role={variant === "danger" ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={pending || undefined}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onSubmit={event => {
        event.preventDefault();
        if(!pending) confirmDialog();
      }}
    >
      {dialog.showClose !== false && <button
        type="button"
        className="close appDialogClose"
        aria-label="Fechar diálogo"
        disabled={pending}
        onClick={cancelDialog}
      >×</button>}
      <h2 id={titleId}>{title}</h2>
      {description && <p id={descriptionId} className="muted">{description}</p>}
      {dialog.content}

      {variant === "input" && <label className="appDialogInput" htmlFor={inputId}>
        <span>{dialog.inputLabel || "Valor"}</span>
        <Input
          {...inputProps}
          ref={inputRef}
          id={inputId}
          type={dialog.inputType || inputProps.type || "text"}
          value={inputValue}
          placeholder={dialog.inputPlaceholder ?? inputProps.placeholder}
          required={dialog.required ?? inputProps.required}
          aria-invalid={Boolean(dialog.error) || undefined}
          aria-describedby={dialog.error ? `${inputId}-error` : inputProps["aria-describedby"]}
          disabled={pending || inputProps.disabled}
          onChange={event => {
            setInputValue(event.currentTarget.value);
            if(typeof inputProps.onChange === "function") inputProps.onChange(event);
          }}
        />
      </label>}
      {dialog.error && <p id={`${inputId}-error`} className="feedbackMessage error" role="alert">{dialog.error}</p>}

      <div className="finishActions appDialogActions">
        {showCancel && <button
          ref={cancelRef}
          type="button"
          className="ghost"
          disabled={pending}
          onClick={cancelDialog}
        >{dialog.cancelLabel || "Cancelar"}</button>}
        <button
          ref={confirmRef}
          type="submit"
          className={variant === "danger" ? "danger" : ""}
          disabled={pending}
        >{dialog.confirmLabel || defaultConfirmLabel(variant)}</button>
      </div>
    </form>
  </div>;
}
