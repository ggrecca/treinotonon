export const ONBOARDING_VERSION = 1;

export function onboardingStorageKey(userId, mode){
  const owner = String(userId || "local").trim() || "local";
  const role = mode === "trainer" ? "trainer" : "athlete";
  return `treino-tonon:onboarding:v${ONBOARDING_VERSION}:${owner}:${role}`;
}

export function readOnboardingState(storage, userId, mode){
  const fallback = {version:ONBOARDING_VERSION, completed:false, completedSteps:[], updatedAt:""};
  try {
    const raw = storage?.getItem?.(onboardingStorageKey(userId, mode));
    const parsed = raw ? JSON.parse(raw) : null;
    if(!parsed || parsed.version !== ONBOARDING_VERSION) return fallback;
    return {
      version:ONBOARDING_VERSION,
      completed:parsed.completed === true,
      completedSteps:Array.from(new Set(Array.isArray(parsed.completedSteps) ? parsed.completedSteps.map(String) : [])),
      updatedAt:String(parsed.updatedAt || ""),
    };
  } catch {
    return fallback;
  }
}

export function writeOnboardingState(storage, userId, mode, state){
  const next = {
    version:ONBOARDING_VERSION,
    completed:state?.completed === true,
    completedSteps:Array.from(new Set(Array.isArray(state?.completedSteps) ? state.completedSteps.map(String) : [])),
    updatedAt:new Date().toISOString(),
  };
  try {
    storage?.setItem?.(onboardingStorageKey(userId, mode), JSON.stringify(next));
    return next;
  } catch {
    return next;
  }
}

export function mergeOnboardingProgress(storage, userId, mode, state, derivedStepIds=[]){
  const completedSteps = Array.from(new Set([
    ...(state?.completedSteps || []),
    ...derivedStepIds.filter(Boolean).map(String),
  ]));
  return writeOnboardingState(storage, userId, mode, {...state, completedSteps});
}

export function finishOnboarding(storage, userId, mode, state){
  return writeOnboardingState(storage, userId, mode, {...state, completed:true});
}

export function trainerOnboardingSteps(progress={}){
  return [
    {id:"create-workout", title:"Criar treino", description:"Monte um modelo reutilizável para acelerar novas prescrições.", done:!!progress.hasWorkout, actionLabel:"Criar treino"},
    {id:"register-student", title:"Cadastrar aluno", description:"Comece pelo e-mail do atleta para criar o vínculo com segurança.", done:!!progress.hasInvite, actionLabel:"Cadastrar aluno"},
    {id:"invite-athlete", title:"Convidar atleta", description:"Envie o deep link por e-mail, cópia ou compartilhamento.", done:!!progress.hasInvite, actionLabel:"Abrir convites"},
    {id:"assign-workout", title:"Atribuir treino", description:"Depois do aceite, copie um modelo para o aluno selecionado.", done:!!progress.hasAssignment, actionLabel:"Ver treinos"},
    {id:"complete-training", title:"Concluir primeiro treinamento", description:"A primeira execução aparecerá no dashboard e nas atividades recentes.", done:!!progress.hasSession, actionLabel:"Ver dashboard"},
  ];
}

export function athleteOnboardingSteps(progress={}){
  return [
    {id:"accept-invite", title:"Como aceitar convite", description:"Abra o link recebido e confirme o treinador usando o mesmo e-mail da sua conta.", done:!!progress.hasTrainer, actionLabel:progress.hasPendingInvite ? "Responder convite" : "Entendi"},
    {id:"find-trainer", title:"Como encontrar treinador", description:"Peça ao seu treinador um convite por e-mail ou link para conectar sua conta.", done:!!progress.hasTrainer, actionLabel:"Ver convites"},
    {id:"start-workout", title:"Como iniciar o primeiro treino", description:"Quando um treino for atribuído, abra Treinos e toque em Iniciar treino.", done:!!progress.hasWorkout, actionLabel:"Ver treinos"},
  ];
}
