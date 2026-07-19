import React from "react";
export function Toast({message, variant = "info", action, onDismiss, className = ""}) { return <div className={`tt-toast tt-toast--${variant} ${className}`.trim()} role={variant === "danger" ? "alert" : "status"}><span>{message}</span>{action}{onDismiss && <button type="button" className="tt-button tt-button--ghost tt-button--sm" onClick={onDismiss} aria-label="Fechar notificação">×</button>}</div>; }
export function ToastRegion({children}) { return <div className="tt-toast-region" aria-live="polite" aria-label="Notificações">{children}</div>; }
