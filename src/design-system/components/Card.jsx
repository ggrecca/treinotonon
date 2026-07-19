import React from "react";

export function Card({elevated = false, className = "", children, ...props}) { return <section {...props} className={`tt-card ${elevated ? "tt-card--elevated" : ""} ${className}`.trim()}>{children}</section>; }
