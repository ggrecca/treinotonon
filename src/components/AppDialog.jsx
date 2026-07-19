import React, {useEffect, useRef, useState} from "react";
import {Dialog, Input} from "../design-system";

function dialogVariant(dialog) {
  const variant = dialog?.variant || dialog?.type || "notice";
  return ["notice", "confirm", "danger", "input"].includes(variant) ? variant : "notice";
}

function defaultConfirmLabel(variant) {
  if (variant === "notice") return "Entendi";
  if (variant === "danger") return "Confirmar";
  return "Continuar";
}

export function AppDialog({dialog, onResolve}) {
  const inputRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const variant = dialogVariant(dialog);

  useEffect(() => { setInputValue(String(dialog?.defaultValue ?? dialog?.value ?? "")); }, [dialog]);
  if (!dialog) return null;

  const description = dialog.description ?? dialog.message;
  const title = dialog.title || (variant === "danger" ? "Confirmar ação" : "Aviso");
  const showCancel = variant !== "notice" && dialog.showCancel !== false;
  const pending = Boolean(dialog.pending);
  const inputProps = dialog.inputProps || {};
  const initialFocus = dialog.initialFocus === "cancel" ? cancelRef : dialog.initialFocus === "confirm" ? confirmRef : variant === "input" ? inputRef : variant === "danger" ? cancelRef : confirmRef;
  const resolve = result => { if (typeof onResolve === "function") onResolve(result); };
  const confirmDialog = () => resolve(variant === "input" ? inputValue : true);
  const cancelDialog = () => resolve(variant === "input" ? null : false);

  return <Dialog
    open
    title={title}
    description={description}
    variant={variant === "danger" ? "danger" : "normal"}
    className={`appDialogCard ${dialog.className || ""}`.trim()}
    backdropClassName={`modal appDialogOverlay appDialog-${variant}`}
    pending={pending}
    dismissible={dialog.dismissible !== false}
    closeOnEscape={dialog.dismissible !== false}
    closeOnBackdrop={Boolean(dialog.closeOnBackdrop)}
    showClose={dialog.showClose !== false}
    onClose={cancelDialog}
    initialFocus={initialFocus}
    formId="app-dialog-form"
    onSubmit={event => { event.preventDefault(); if (!pending) confirmDialog(); }}
    actions={<>{showCancel && <button ref={cancelRef} type="button" className="ghost" disabled={pending} onClick={cancelDialog}>{dialog.cancelLabel || "Cancelar"}</button>}<button ref={confirmRef} type="submit" className={variant === "danger" ? "danger" : ""} disabled={pending}>{dialog.confirmLabel || defaultConfirmLabel(variant)}</button></>}
  >
    {dialog.content}
    {variant === "input" && <label className="appDialogInput" htmlFor="app-dialog-input"><span>{dialog.inputLabel || "Valor"}</span><Input {...inputProps} ref={inputRef} id="app-dialog-input" type={dialog.inputType || inputProps.type || "text"} value={inputValue} placeholder={dialog.inputPlaceholder ?? inputProps.placeholder} required={dialog.required ?? inputProps.required} aria-invalid={Boolean(dialog.error) || undefined} aria-describedby={dialog.error ? "app-dialog-input-error" : inputProps["aria-describedby"]} disabled={pending || inputProps.disabled} onChange={event => { setInputValue(event.currentTarget.value); if (typeof inputProps.onChange === "function") inputProps.onChange(event); }} /></label>}
    {dialog.error && <p id="app-dialog-input-error" className="feedbackMessage error" role="alert">{dialog.error}</p>}
  </Dialog>;
}
