export function deriveSyncState({isCloud, online, bootstrapState, retrying, pendingCount, hasSafeData}){
  if(isCloud && !online) return "offline";
  if(retrying) return "retrying";
  if(bootstrapState === "error") return "load-error";
  if(bootstrapState !== "loaded" && !hasSafeData) return "loading";
  if(Number(pendingCount) > 0) return "pending-sync";
  return "loaded";
}

export function canRunRemoteMutation({isCloud, online, bootstrapState, retrying}){
  if(bootstrapState !== "loaded" || retrying) return false;
  if(isCloud && !online) return false;
  return true;
}

