import React from "react";

export function Card({title, value, sub}) {
  return <section className="card">
    <p>{title}</p>
    <h3>{value}</h3>
    <small>{sub}</small>
  </section>;
}
