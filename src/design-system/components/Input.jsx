import React, {forwardRef, useId} from "react";

function fieldMetadata({id, hint, helperText, error, describedBy}) {
  const helper = helperText || hint;
  const descriptions = [describedBy, helper ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return {helper, descriptions};
}

export const Input = forwardRef(function Input({label, hint, helperText, error, id, className = "", wrapperClassName = "", startAdornment, endAdornment, prefix, suffix, ...props}, ref) {
  const generatedId = useId().replace(/:/g, "");
  const inputId = id || `tt-input-${generatedId}`;
  const {helper, descriptions} = fieldMetadata({id: inputId, hint, helperText, error, describedBy: props["aria-describedby"]});
  const control = <input {...props} ref={ref} id={inputId} className={`tt-input__control ${className}`.trim()} aria-invalid={props["aria-invalid"] ?? (Boolean(error) || undefined)} aria-describedby={descriptions} />;
  const decoratedControl = startAdornment || endAdornment || prefix || suffix ? <span className="tt-input__frame">{(startAdornment || prefix) && <span className="tt-input__adornment" aria-hidden="true">{startAdornment || prefix}</span>}{control}{(endAdornment || suffix) && <span className="tt-input__adornment" aria-hidden="true">{endAdornment || suffix}</span>}</span> : control;

  if(!label && !helper && !error) return decoratedControl;
  return <label htmlFor={inputId} className={`tt-input ${wrapperClassName}`.trim()}>{label && <span className="tt-input__label">{label}</span>}{decoratedControl}{helper && <span id={`${inputId}-hint`} className="tt-input__hint">{helper}</span>}{error && <span id={`${inputId}-error`} className="tt-input__error" role="alert">{error}</span>}</label>;
});

export const Textarea = forwardRef(function Textarea({label, hint, helperText, error, id, className = "", wrapperClassName = "", ...props}, ref) {
  const generatedId = useId().replace(/:/g, "");
  const inputId = id || `tt-textarea-${generatedId}`;
  const {helper, descriptions} = fieldMetadata({id: inputId, hint, helperText, error, describedBy: props["aria-describedby"]});
  const control = <textarea {...props} ref={ref} id={inputId} className={`tt-textarea__control ${className}`.trim()} aria-invalid={props["aria-invalid"] ?? (Boolean(error) || undefined)} aria-describedby={descriptions} />;

  if(!label && !helper && !error) return control;
  return <label htmlFor={inputId} className={`tt-input ${wrapperClassName}`.trim()}>{label && <span className="tt-input__label">{label}</span>}{control}{helper && <span id={`${inputId}-hint`} className="tt-input__hint">{helper}</span>}{error && <span id={`${inputId}-error`} className="tt-input__error" role="alert">{error}</span>}</label>;
});

export const Select = forwardRef(function Select({label, hint, helperText, error, id, className = "", wrapperClassName = "", children, ...props}, ref) {
  const generatedId = useId().replace(/:/g, "");
  const inputId = id || `tt-select-${generatedId}`;
  const {helper, descriptions} = fieldMetadata({id: inputId, hint, helperText, error, describedBy: props["aria-describedby"]});
  const control = <select {...props} ref={ref} id={inputId} className={`tt-select__control ${className}`.trim()} aria-invalid={props["aria-invalid"] ?? (Boolean(error) || undefined)} aria-describedby={descriptions}>{children}</select>;

  if(!label && !helper && !error) return control;
  return <label htmlFor={inputId} className={`tt-input ${wrapperClassName}`.trim()}>{label && <span className="tt-input__label">{label}</span>}{control}{helper && <span id={`${inputId}-hint`} className="tt-input__hint">{helper}</span>}{error && <span id={`${inputId}-error`} className="tt-input__error" role="alert">{error}</span>}</label>;
});
