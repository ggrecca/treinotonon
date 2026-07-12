import React from "react";

export function DashboardSwitcher({keysList, labels, value, setValue}) {
  const baseKeys = keysList.filter(key => ["A", "B", "C"].includes(key));
  const customKeys = keysList.filter(key => !["A", "B", "C"].includes(key));

  return <div className="switchBlock">
    <button className={value === "todos" ? "allFilter active" : "allFilter"} onClick={() => setValue("todos")}>Todos</button>
    {baseKeys.length > 0 && <>
      <div className="switchLabel">Treinos padrão</div>
      <div className="switcher scroll">
        {baseKeys.map(key => <button key={key} onClick={() => setValue(key)} className={value === key ? "active" : ""}>{labels[key]}</button>)}
      </div>
    </>}
    {customKeys.length > 0 && <>
      <div className="switchLabel">Personalizados</div>
      <div className="switcher scroll">
        {customKeys.map(key => <button key={key} onClick={() => setValue(key)} className={value === key ? "active" : ""}>{labels[key]}</button>)}
      </div>
    </>}
  </div>;
}
