export const UI_HISTORY_STATE_KEY = "treinoTononUi";

export function createUiHistoryState(index, viewKey=""){
  return {
    [UI_HISTORY_STATE_KEY]:{
      index:Math.max(0, Number(index) || 0),
      viewKey:String(viewKey || ""),
    },
  };
}

export function readUiHistoryState(state){
  const value = state?.[UI_HISTORY_STATE_KEY];
  if(!value || !Number.isInteger(value.index) || value.index < 0) return null;
  return {index:value.index, viewKey:String(value.viewKey || "")};
}

export function mergeUiHistoryState(state, index, viewKey=""){
  const base = state && typeof state === "object" ? state : {};
  return {...base, ...createUiHistoryState(index, viewKey)};
}

export function uiHistoryDirection(currentIndex, nextState){
  const next = readUiHistoryState(nextState);
  if(!next) return "external";
  if(next.index < currentIndex) return "back";
  if(next.index > currentIndex) return "forward";
  return "same";
}
