import React from "react";
export function Chip({selected = false, className = "", children, ...props}) { return <button {...props} type={props.type || "button"} aria-pressed={selected} className={`tt-chip ${selected ? "tt-chip--selected" : ""} ${className}`.trim()}>{children}</button>; }
