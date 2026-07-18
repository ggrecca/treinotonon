function email(value){
  return String(value || "").trim().toLowerCase();
}

function number(value){
  const parsed = Number(String(value ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sessionDate(value){
  const raw = String(value || "");
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function sessionBelongsToSubject(session, subject){
  if(!session || !subject) return false;
  const subjectId = String(subject.studentId || subject.id || "");
  const sessionId = String(session.studentId || session.userId || "");
  if(sessionId) return !!subjectId && sessionId === subjectId;
  const subjectEmail = email(subject.studentEmail || subject.email);
  const sessionEmail = email(session.studentEmail || session.userEmail);
  if(sessionEmail) return !!subjectEmail && sessionEmail === subjectEmail;
  return !!subject.isSelf;
}

export function sessionsForSubject(sessions, subject){
  if(!subject) return [];
  return (sessions || []).filter(session=>sessionBelongsToSubject(session, subject));
}

function performedSegments(item){
  const sets = Array.isArray(item?.sets) ? item.sets : [];
  if(!sets.length) return [{load:item?.load, reps:item?.reps, done:item?.done}];
  return sets.flatMap(set=>Array.isArray(set?.drops) && set.drops.length ? set.drops : [set]);
}

export function maxPerformedLoad(item){
  return Math.max(0, ...performedSegments(item).map(segment=>number(segment?.load)));
}

export function performedItemVolume(item){
  const stored = number(item?.volume);
  if(stored > 0) return stored;
  return performedSegments(item).reduce((sum,segment)=>sum + number(segment?.load) * number(segment?.reps), 0);
}

export function buildExerciseEvolution(sessions, exerciseName){
  if(!exerciseName) return [];
  const rows = [];
  (sessions || []).forEach(session=>(session.items || []).forEach(item=>{
    const name = item.exercise || item.name || "";
    if(name !== exerciseName) return;
    const load = maxPerformedLoad(item);
    if(!load) return;
    rows.push({date:session.date, load, raw:String(load), rpe:item.rpe || "", note:item.note || ""});
  }));
  return rows.sort((a,b)=>sessionDate(a.date) - sessionDate(b.date));
}

export function buildExerciseSummary(history){
  if(!history?.length) return null;
  const last = history[history.length - 1];
  const rpes = history.map(row=>number(row.rpe)).filter(Boolean);
  return {
    last,
    best:Math.max(...history.map(row=>number(row.load))),
    avgRpe:rpes.length ? (rpes.reduce((sum,value)=>sum + value,0) / rpes.length).toFixed(1) : "—",
    count:history.length,
  };
}

export function buildTrainerAnalytics(sessions, options={}){
  const rows = (sessions || []).slice().sort((a,b)=>sessionDate(a.date) - sessionDate(b.date));
  const now = options.now ? new Date(options.now) : new Date();
  const groupLookup = options.groupLookup || {};
  const weeklyVolumeTrend = Array.from({length:8},(_,index)=>{
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - 7 * (7 - index));
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {semana:`${String(start.getDate()).padStart(2,"0")}/${String(start.getMonth()+1).padStart(2,"0")}`, start, end, volume:0, treinos:0};
  });
  const groupMap = new Map();
  const frequencyMap = new Map();
  const recordMap = new Map();
  let done = 0;
  let total = 0;
  let volume = 0;
  rows.forEach(session=>{
    const date = sessionDate(session.date);
    const week = weeklyVolumeTrend.find(row=>date >= row.start && date < row.end);
    if(week) week.treinos += 1;
    const workoutName = session.workoutName || session.workoutLabel || session.workout || "Treino";
    frequencyMap.set(workoutName, (frequencyMap.get(workoutName) || 0) + 1);
    (session.items || []).forEach(item=>{
      total += 1;
      if(item.done) done += 1;
      const itemVolume = performedItemVolume(item);
      volume += itemVolume;
      if(week) week.volume += itemVolume;
      const exerciseName = item.exercise || item.name || "Exercício";
      const group = item.group || groupLookup[String(exerciseName).toLowerCase()] || "Outro";
      const currentGroup = groupMap.get(group) || {group, volume:0, count:0};
      currentGroup.volume += itemVolume;
      currentGroup.count += 1;
      groupMap.set(group, currentGroup);
      const load = maxPerformedLoad(item);
      const previous = recordMap.get(exerciseName);
      if(load && (!previous || load > previous.load)) recordMap.set(exerciseName, {exercise:exerciseName, load, rpe:item.rpe || "", date:session.date});
    });
  });
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0,0,0,0);
  return {
    sessionCount:rows.length,
    weeklyCount:rows.filter(session=>sessionDate(session.date) >= startOfWeek).length,
    completion:{done, total, percent:total ? Math.round(done / total * 100) : 0, volume},
    weeklyVolumeTrend:weeklyVolumeTrend.map(({semana,volume:rowVolume,treinos})=>({semana, volume:rowVolume, treinos})),
    groupVolumeStats:[...groupMap.values()].sort((a,b)=>b.volume - a.volume),
    workoutFrequencyStats:[...frequencyMap].map(([name,count])=>({name,count})).sort((a,b)=>b.count - a.count),
    exerciseRecords:[...recordMap.values()].sort((a,b)=>b.load - a.load).slice(0,8),
  };
}

