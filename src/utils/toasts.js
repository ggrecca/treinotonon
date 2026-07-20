export const TOAST_TYPES = ["success", "info", "warning", "error"];

export const TOAST_DURATIONS = {
  success: 3200,
  info: 4200,
  warning: 6500,
  error: 8000,
};

export function normalizeToastType(type){
  return TOAST_TYPES.includes(type) ? type : "info";
}

export function createToast(input, now=Date.now()){
  const type = normalizeToastType(input?.type);
  return {
    ...input,
    id: input?.id || `${now}-${Math.random()}`,
    message: String(input?.message || "").trim(),
    type,
    count: Math.max(1, Number(input?.count) || 1),
    createdAt: now,
    duration: Number.isFinite(input?.duration) ? Math.max(0, input.duration) : TOAST_DURATIONS[type],
  };
}

export function enqueueToast(queue, input, options={}){
  const now = options.now ?? Date.now();
  const max = Math.max(1, Number(options.max) || 4);
  const toast = createToast(input, now);
  if(!toast.message) return Array.isArray(queue) ? queue : [];

  const current = Array.isArray(queue) ? queue : [];
  const duplicateIndex = current.findIndex(item=>item.type === toast.type && item.message === toast.message);
  if(duplicateIndex >= 0){
    const duplicate = current[duplicateIndex];
    const refreshed = {
      ...duplicate,
      ...toast,
      id: duplicate.id,
      count: (Number(duplicate.count) || 1) + 1,
    };
    return [...current.slice(0, duplicateIndex), ...current.slice(duplicateIndex + 1), refreshed].slice(-max);
  }

  return [...current, toast].slice(-max);
}
