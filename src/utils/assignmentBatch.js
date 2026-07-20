export async function executeAssignmentBatch(entries, saveAssignment){
  const source = Array.isArray(entries) ? entries : [];
  const settled = await Promise.allSettled(source.map(entry=>saveAssignment(entry.copy, entry)));
  return settled.reduce((result, outcome, index)=>{
    const entry = source[index];
    if(outcome.status === "fulfilled") result.succeeded.push(entry);
    else result.failed.push({...entry, error:outcome.reason?.message || "Não foi possível concluir esta atribuição."});
    return result;
  }, {succeeded:[], failed:[]});
}

export function mergeAssignmentsById(current, entries){
  const merged = new Map((Array.isArray(current) ? current : []).map((item, index)=>[
    item?.id ? String(item.id) : `legacy-${index}`,
    item,
  ]));
  (Array.isArray(entries) ? entries : []).forEach(entry=>{
    const item = entry?.copy || entry;
    if(item?.id) merged.set(String(item.id), item);
  });
  return [...merged.values()];
}
