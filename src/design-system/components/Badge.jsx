import React from "react";
export function Badge({variant = "neutral", className = "", children, ...props}) { return <span {...props} className={`tt-badge tt-badge--${variant} ${className}`.trim()}>{children}</span>; }
