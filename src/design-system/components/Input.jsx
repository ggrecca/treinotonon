import React, {forwardRef, useId} from "react";

export const Input = forwardRef(function Input({label, hint, error, id, className = "", ...props}, ref) {
  const generatedId = useId().replace(/:/g, "");
  const inputId = id || `tt-input-${generatedId}`;
  const describedBy = [hint ? `${inputId}-hint` : "", error ? `${inputId}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <label className={`tt-input ${className}`.trim()}>{label && <span className="tt-input__label">{label}</span>}<input {...props} ref={ref} id={inputId} className="tt-input__control" aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} />{hint && <span id={`${inputId}-hint`} className="tt-input__hint">{hint}</span>}{error && <span id={`${inputId}-error`} className="tt-input__error" role="alert">{error}</span>}</label>;
});
