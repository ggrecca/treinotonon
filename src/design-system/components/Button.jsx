import React from "react";

export function Button({variant = "primary", size = "md", loading = false, iconOnly = false, type = "button", className = "", children, disabled, ...props}) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`tt-button tt-button--${variant} tt-button--${size} ${iconOnly ? "tt-button--icon-only" : ""} ${className}`.trim()}>{loading && <span className="tt-loading__spinner" aria-hidden="true" />}{children}</button>;
}
