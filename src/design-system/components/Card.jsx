import React from "react";

export function Card({as: Component = "section", elevated = false, interactive = false, className = "", children, ...props}) {
  const buttonProps = Component === "button" ? {type: props.type || "button"} : {};

  return <Component {...props} {...buttonProps} className={`tt-card ${elevated ? "tt-card--elevated" : ""} ${interactive ? "tt-card--interactive" : ""} ${className}`.trim()}>{children}</Component>;
}
