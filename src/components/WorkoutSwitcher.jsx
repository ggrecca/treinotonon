import React from "react";

export function WorkoutSwitcher({keysList, labels, workout, setWorkout, disabled = false}) {
  return <div className="switcher scroll">
    {keysList.map(key => <button key={key} disabled={disabled} onClick={() => setWorkout(key)} className={workout === key ? "active" : ""}>{labels[key]}</button>)}
  </div>;
}
