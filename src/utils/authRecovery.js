const RECOVERY_QUERY_KEY = "auth";
const RECOVERY_QUERY_VALUE = "recovery";

function locationUrl(locationLike){
  if(!locationLike) return null;
  try {
    return new URL(locationLike.href || String(locationLike));
  } catch {
    return null;
  }
}

function hashParams(url){
  return new URLSearchParams(String(url?.hash || "").replace(/^#/, ""));
}

export function buildPasswordRecoveryRedirect(locationLike=globalThis.location){
  const url = locationUrl(locationLike);
  if(!url) return "";
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  url.searchParams.set(RECOVERY_QUERY_KEY, RECOVERY_QUERY_VALUE);
  return url.toString();
}

export function readPasswordRecoveryLocation(locationLike=globalThis.location){
  const url = locationUrl(locationLike);
  if(!url) return {requested:false, errorCode:"", errorMessage:""};
  const fragment = hashParams(url);
  const requested = url.searchParams.get(RECOVERY_QUERY_KEY) === RECOVERY_QUERY_VALUE
    || fragment.get("type") === RECOVERY_QUERY_VALUE;
  const errorCode = String(fragment.get("error_code") || url.searchParams.get("error_code") || "");
  const rawError = String(fragment.get("error_description") || url.searchParams.get("error_description") || "");
  const errorMessage = rawError
    ? "Este link de recuperação é inválido, expirou ou já foi usado. Solicite um novo link."
    : "";
  return {requested:requested || !!errorCode || !!rawError, errorCode, errorMessage};
}

export function cleanPasswordRecoveryUrl(locationLike=globalThis.location){
  const url = locationUrl(locationLike);
  if(!url) return "";
  url.hash = "";
  [RECOVERY_QUERY_KEY, "code", "error", "error_code", "error_description"].forEach(key=>url.searchParams.delete(key));
  return `${url.pathname}${url.search}${url.hash}` || "/";
}

export function validateNewPassword(password, confirmation){
  if(!password) return "Informe a nova senha.";
  if(password.length < 8) return "Use pelo menos 8 caracteres na nova senha.";
  if(password !== confirmation) return "As senhas não coincidem.";
  return "";
}

