import {describe, expect, it} from "vitest";
import {buildExerciseEvolution, buildTrainerAnalytics, maxPerformedLoad, performedItemVolume, sessionBelongsToSubject, sessionsForSubject} from "../trainerAnalytics";

const athleteA = {studentId:"athlete-a", studentEmail:"a@example.com"};
const athleteB = {studentId:"athlete-b", studentEmail:"b@example.com"};

describe("trainer analytics isolation", ()=>{
  it("keeps equal exercise names isolated by athlete", ()=>{
    const sessions = [
      {studentId:"athlete-a", date:"2026-07-01", items:[{exercise:"Supino", sets:[{load:"40", reps:"10"}], done:true}]},
      {studentId:"athlete-b", date:"2026-07-02", items:[{exercise:"Supino", sets:[{load:"100", reps:"5"}], done:true}]},
    ];
    const history = buildExerciseEvolution(sessionsForSubject(sessions, athleteA), "Supino");
    expect(history.map(row=>row.load)).toEqual([40]);
  });

  it("lets UUID identity win over a conflicting legacy email", ()=>{
    const session = {studentId:"athlete-b", studentEmail:"a@example.com"};
    expect(sessionBelongsToSubject(session, athleteA)).toBe(false);
    expect(sessionBelongsToSubject(session, athleteB)).toBe(true);
  });

  it("uses email only when a legacy session has no subject id", ()=>{
    expect(sessionBelongsToSubject({studentEmail:"A@example.com"}, athleteA)).toBe(true);
  });

  it("returns no portfolio data when no subject is selected", ()=>{
    expect(sessionsForSubject([{studentId:"athlete-a"}], null)).toEqual([]);
  });

  it("reads the highest progressive/drop load", ()=>{
    const item = {sets:[{load:"40", reps:"10"},{load:"55", reps:"8", drops:[{load:"55", reps:"8"},{load:"30", reps:"6"}]}]};
    expect(maxPerformedLoad(item)).toBe(55);
  });

  it("calculates real set and drop volume", ()=>{
    expect(performedItemVolume({sets:[{load:"40", reps:"10"},{load:"40", reps:"10"},{load:"40", reps:"10"}]})).toBe(1200);
    expect(performedItemVolume({sets:[{drops:[{load:"50", reps:"5"},{load:"30", reps:"5"}]}]})).toBe(400);
  });

  it("builds completion, volume and groups only from scoped sessions", ()=>{
    const analytics = buildTrainerAnalytics([
      {date:"2026-07-16", workoutName:"A", items:[{exercise:"Supino", group:"Peito", done:true, sets:[{load:"40", reps:"10"}]}]},
      {date:"2026-07-17", workoutName:"A", items:[{exercise:"Remada", group:"Costas", done:false, sets:[{load:"30", reps:"10"}]}]},
    ], {now:"2026-07-18"});
    expect(analytics.completion).toEqual({done:1, total:2, percent:50, volume:700});
    expect(analytics.groupVolumeStats.map(row=>row.group)).toEqual(["Peito","Costas"]);
    expect(analytics.workoutFrequencyStats).toEqual([{name:"A", count:2}]);
  });
});
