import React from "react";

function cardClassName(className, interactive) {
  return ["card", interactive ? "interactiveCard" : "", className]
    .filter(Boolean)
    .join(" ");
}

export function Card({title, value, sub, onActivate, icon, className = "", ariaLabel}) {
  const interactive = typeof onActivate === "function";
  const classes = cardClassName(className, interactive);

  if(interactive) {
    return <button type="button" className={classes} onClick={onActivate} aria-label={ariaLabel}>
      {icon && <span className="cardIcon" aria-hidden="true">{icon}</span>}
      <span className="cardContent">
        <span className="cardTitle">{title}</span>
        <span className="cardValue">{value}</span>
        <small className="cardSub">{sub}</small>
      </span>
    </button>;
  }

  return <section className={classes} aria-label={ariaLabel}>
    {icon && <span className="cardIcon" aria-hidden="true">{icon}</span>}
    <p>{title}</p>
    <h3>{value}</h3>
    <small>{sub}</small>
  </section>;
}
