import React from "react";
export function Loading({label = "Carregando"}) { return <span className="tt-loading" role="status"><span className="tt-loading__spinner" aria-hidden="true" />{label}</span>; }
export function Skeleton({width = "100%", height = "1rem", className = "", ...props}) { return <span {...props} className={`tt-skeleton ${className}`.trim()} aria-hidden="true" style={{width, height, ...props.style}} />; }
export function EmptyState({title, description, action, icon}) { return <section className="tt-empty-state">{icon}{title && <h2 className="tt-empty-state__title">{title}</h2>}{description && <p className="tt-empty-state__description">{description}</p>}{action}</section>; }
