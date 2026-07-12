function numberFromText(value) {
  const normalized = String(value || "").replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function cleanLabel(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function isDropSetType(type) {
  return String(type || "").trim().toUpperCase() === "DROP SET";
}

export function isRestPauseType(type) {
  return String(type || "").trim().toUpperCase() === "REST PAUSE";
}

export function isSegmentedRepType(type) {
  return isDropSetType(type) || isRestPauseType(type);
}

export function parseSingleRepTarget(value) {
  const part = cleanLabel(value);
  if(!part) return null;

  const range = part.match(/^(\d+(?:[,.]\d+)?)\s*(?:-|a|ate)\s*(\d+(?:[,.]\d+)?)$/i);
  if(range) {
    const min = numberFromText(range[1]);
    const max = numberFromText(range[2]);
    if(min !== null && max !== null) return {type:"range", min, max, label:part};
  }

  const fixed = numberFromText(part);
  if(fixed !== null) return {type:"fixed", value:fixed, label:part};

  return {type:"text", label:part};
}

export function parseRepTargets(value) {
  const text = cleanLabel(value);
  if(!text) return [];

  const parts = text.includes("/")
    ? text.split("/")
    : text.split(/\s+[-–—]\s+/);

  return parts
    .map(parseSingleRepTarget)
    .filter(Boolean);
}

export function parseDropTargets(value) {
  const text = cleanLabel(value);
  if(!text) return [];
  return text
    .split("+")
    .map(parseSingleRepTarget)
    .filter(Boolean);
}

export function normalizeRepTargets(value) {
  if(Array.isArray(value)) {
    return value
      .map(item => {
        // The progressive editor works with input labels (strings) while the
        // persisted format uses structured targets. Accept both formats so a
        // typed value is not discarded on every React state update.
        if(typeof item === "string" || typeof item === "number") return parseSingleRepTarget(item);
        if(!item || typeof item !== "object") return null;
        const label = cleanLabel(item.label);
        if(item.type === "range") {
          const min = numberFromText(item.min);
          const max = numberFromText(item.max);
          if(min !== null && max !== null) return {type:"range", min, max, label:label || `${min}-${max}`};
        }
        if(item.type === "fixed") {
          const fixed = numberFromText(item.value);
          if(fixed !== null) return {type:"fixed", value:fixed, label:label || String(fixed)};
        }
        if(label) return {type:"text", label};
        return null;
      })
      .filter(Boolean);
  }
  return parseRepTargets(value);
}

export function targetLabel(target) {
  return cleanLabel(target?.label);
}

export function expandRepTargetsForSets(targets, setCount, fallbackText = "") {
  const parsedTargets = normalizeRepTargets(targets);
  const fallbackTargets = parsedTargets.length ? parsedTargets : parseRepTargets(fallbackText);
  const safeCount = Math.max(1, Math.min(12, Math.round(Number(setCount) || 1)));
  if(!fallbackTargets.length) return Array.from({length:safeCount}, () => null);

  return Array.from({length:safeCount}, (_, index) => {
    return fallbackTargets[index] || fallbackTargets[fallbackTargets.length - 1] || null;
  });
}


export function repTargetLabelsForEditing(targets, setCount, fallbackText = "") {
  const safeCount = Math.max(1, Math.min(12, Math.round(Number(setCount) || 1)));
  const rawTargets = Array.isArray(targets) ? targets : [];
  const fallbackTargets = expandRepTargetsForSets(normalizeRepTargets(rawTargets), safeCount, fallbackText);
  return Array.from({length:safeCount}, (_, index) => {
    if(index < rawTargets.length) {
      const raw = rawTargets[index];
      return typeof raw === "string" || typeof raw === "number" ? String(raw) : targetLabel(raw);
    }
    return targetLabel(fallbackTargets[index]);
  });
}

export function setRepTargetLabelForEditing(targets, setCount, index, value, fallbackText = "") {
  const labels = repTargetLabelsForEditing(targets, setCount, fallbackText);
  labels[index] = value;
  return labels;
}

export function buildRepPlan({type, reps, targets, setCount}) {
  const safeCount = Math.max(1, Math.min(12, Math.round(Number(setCount) || 1)));
  if(isSegmentedRepType(type)) {
    const explicitDrops = Array.isArray(targets) && targets.some(item => item?.drops)
      ? targets[0]?.drops || []
      : [];
    const drops = normalizeRepTargets(explicitDrops).length
      ? normalizeRepTargets(explicitDrops)
      : parseDropTargets(reps);
    const fallbackDrops = drops.length ? drops : parseRepTargets(reps).slice(0, 1);
    return Array.from({length:safeCount}, (_, setIndex) => ({
      setIndex,
      drops:fallbackDrops,
      segmentKind:isRestPauseType(type) ? "rest_pause" : "drop"
    }));
  }

  return expandRepTargetsForSets(targets, safeCount, reps).map((target, setIndex) => ({
    setIndex,
    target
  }));
}

export function repTargetsToText(targets) {
  return normalizeRepTargets(targets).map(targetLabel).filter(Boolean).join(" / ");
}

export function hasStructuredRepTargets(value) {
  return normalizeRepTargets(value).length > 0;
}
