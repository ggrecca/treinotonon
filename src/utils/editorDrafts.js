const DRAFT_PREFIX = "treino-tonon:editor-draft:v1";

function safePart(value, fallback){
  const text = String(value || fallback || "").trim();
  return encodeURIComponent(text || fallback || "unknown");
}

function stableValue(value){
  if(Array.isArray(value)) return value.map(stableValue);
  if(value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result,key)=>{
      if(value[key] !== undefined) result[key] = stableValue(value[key]);
      return result;
    },{});
  }
  return value;
}

export function editorDraftKey(userId, scope, entityId="new"){
  return `${DRAFT_PREFIX}:${safePart(userId,"local")}:${safePart(scope,"editor")}:${safePart(entityId,"new")}`;
}

export function editorValuesDiffer(current, baseline){
  return JSON.stringify(stableValue(current)) !== JSON.stringify(stableValue(baseline));
}

export function writeEditorDraft(storage, key, value){
  try {
    storage?.setItem(key, JSON.stringify({version:1, savedAt:new Date().toISOString(), value}));
    return true;
  } catch {
    return false;
  }
}

export function readEditorDraft(storage, key){
  try {
    const parsed = JSON.parse(storage?.getItem(key) || "null");
    return parsed?.version === 1 && parsed.value && typeof parsed.value === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function removeEditorDraft(storage, key){
  try {
    storage?.removeItem(key);
  } catch {
    // Draft cleanup must never block a confirmed save or discard.
  }
}

