import React, {useId} from "react";

const MODE_COPY = {
  athlete: {
    title: "Primeiros passos do atleta",
    description: "Prepare seu perfil para acompanhar os treinos com segurança."
  },
  trainer: {
    title: "Primeiros passos do treinador",
    description: "Configure o essencial para começar a acompanhar seus alunos."
  }
};

export function OnboardingPanel({mode, steps = [], onAction, onComplete, onLater}) {
  const normalizedMode = mode === "trainer" ? "trainer" : "athlete";
  const copy = MODE_COPY[normalizedMode];
  const generatedId = useId().replace(/:/g, "");
  const titleId = `onboarding-title-${generatedId}`;
  const progressId = `onboarding-progress-${generatedId}`;
  const completedSteps = steps.filter(step => Boolean(step.done)).length;
  const totalSteps = steps.length;
  const allDone = totalSteps > 0 && completedSteps === totalSteps;
  const progressText = `${completedSteps} de ${totalSteps} etapas concluídas`;

  return <section className={`onboardingPanel onboardingPanel-${normalizedMode}`} aria-labelledby={titleId}>
    <header className="onboardingHeader">
      <div>
        <h2 id={titleId}>{copy.title}</h2>
        <p className="muted">{copy.description}</p>
      </div>
      <span id={progressId} className="onboardingProgressText" aria-live="polite">{progressText}</span>
    </header>

    <progress
      className="onboardingProgress"
      value={completedSteps}
      max={Math.max(totalSteps, 1)}
      aria-labelledby={`${titleId} ${progressId}`}
      aria-valuetext={progressText}
    />

    <ol className="onboardingChecklist" aria-label="Checklist de configuração">
      {steps.map((step, index) => <li
        key={step.id}
        className={`onboardingStep ${step.done ? "done" : "pending"}`}
      >
        <span className="onboardingStepMarker" aria-hidden="true">{step.done ? "✓" : index + 1}</span>
        <div className="onboardingStepContent">
          <div className="onboardingStepHeading">
            <h3>{step.title}</h3>
            <span className="onboardingStepStatus">{step.done ? "Concluído" : "Pendente"}</span>
          </div>
          {step.description && <p>{step.description}</p>}
        </div>
        {!step.done && step.actionLabel && <button
          type="button"
          className="ghost onboardingStepAction"
          onClick={() => typeof onAction === "function" && onAction(step.id)}
        >{step.actionLabel}</button>}
      </li>)}
    </ol>

    <div className="finishActions onboardingActions">
      {typeof onLater === "function" && <button type="button" className="ghost" onClick={onLater}>Fazer depois</button>}
      {typeof onComplete === "function" && <button type="button" disabled={!allDone} onClick={onComplete}>Concluir configuração</button>}
    </div>
  </section>;
}
