import React, {useCallback, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {AlertCircle, AlertTriangle, CheckCircle2, Info, X} from "lucide-react";

export const TOAST_EXIT_DURATION = 180;

const iconByVariant = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  danger: AlertCircle,
};

export function getToastRemainingDuration({createdAt, duration}, now = Date.now()) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, duration - Math.max(0, now - (Number(createdAt) || now)));
}

export function Toast({id, message, description, title, variant = "info", count = 1, duration = 0, createdAt, action, onDismiss, icon, className = ""}) {
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [closing, setClosing] = useState(false);
  const remainingRef = useRef(getToastRemainingDuration({createdAt, duration}));
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const dismissedRef = useRef(false);
  const actionedRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  const lifecycleKey = `${id || "toast"}-${createdAt || 0}-${duration}`;
  const paused = hovered || focusWithin;
  const Icon = icon || iconByVariant[variant] || Info;

  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearTimeout(exitTimerRef.current);
  }, []);
  useEffect(() => {
    remainingRef.current = getToastRemainingDuration({createdAt, duration});
    dismissedRef.current = false;
    actionedRef.current = false;
    setClosing(false);
  }, [lifecycleKey]);

  const requestDismiss = useCallback(() => {
    if (dismissedRef.current || exitTimerRef.current) return;
    clearTimeout(timerRef.current);
    setClosing(true);
    exitTimerRef.current = setTimeout(() => {
      exitTimerRef.current = null;
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      onDismissRef.current?.(id);
    }, TOAST_EXIT_DURATION);
  }, [id]);

  useEffect(() => {
    if (duration <= 0 || paused || closing || dismissedRef.current) return undefined;
    const remaining = remainingRef.current;
    if (remaining <= 0) {
      requestDismiss();
      return undefined;
    }
    const startedAt = Date.now();
    timerRef.current = setTimeout(requestDismiss, remaining);
    return () => {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current = Math.max(0, remaining - (Date.now() - startedAt));
    };
  }, [closing, lifecycleKey, paused, requestDismiss, duration]);

  const handleAction = () => {
    if (actionedRef.current || closing) return;
    actionedRef.current = true;
    action?.onClick?.();
    requestDismiss();
  };
  const handleBlur = event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
  };
  const toastDescription = description ?? message;
  const role = variant === "error" || variant === "danger" ? "alert" : "status";

  return <article
    className={`tt-toast tt-toast--${variant} ${closing ? "tt-toast--closing" : ""} ${className}`.trim()}
    role={role}
    aria-live={role === "alert" ? "assertive" : "polite"}
    aria-atomic="true"
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocusWithin(true)}
    onBlur={handleBlur}
  >
    <span className="tt-toast__icon" aria-hidden="true"><Icon size={20} /></span>
    <div className="tt-toast__content">
      {title && <strong className="tt-toast__title">{title}</strong>}
      {toastDescription && <span className="tt-toast__description">{toastDescription}</span>}
    </div>
    {count > 1 && <span className="tt-toast__count" aria-label={`Repetido ${count} vezes`}>×{count}</span>}
    {action?.label && <button type="button" className="tt-toast__action" onClick={handleAction} disabled={closing}>{action.label}</button>}
    {action?.content}
    {onDismiss && <button type="button" className="tt-toast__close" onClick={requestDismiss} disabled={closing} aria-label="Fechar notificação"><X size={18} aria-hidden="true" /></button>}
  </article>;
}

export function ToastRegion({toasts = [], onDismiss, getAction, className = "", portal = true, label = "Notificações"}) {
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => { if (typeof document !== "undefined") setPortalTarget(document.body); }, []);
  if (!toasts.length) return null;
  const region = <section className={`tt-toast-region ${className}`.trim()} role="region" aria-label={label} aria-live="polite" aria-atomic="true">
    {toasts.map(toast => <Toast key={toast.id} {...toast} variant={toast.type || toast.variant} action={getAction?.(toast)} onDismiss={() => onDismiss?.(toast.id)} />)}
  </section>;
  if (!portal || typeof document === "undefined") return region;
  return portalTarget ? createPortal(region, portalTarget) : null;
}
