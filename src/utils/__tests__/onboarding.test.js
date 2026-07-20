import {describe, expect, it} from "vitest";
import {
  athleteOnboardingSteps,
  finishOnboarding,
  mergeOnboardingProgress,
  onboardingStorageKey,
  readOnboardingState,
  trainerOnboardingSteps,
} from "../onboarding";

function memoryStorage(){
  const values = new Map();
  return {
    getItem:key=>values.get(key) ?? null,
    setItem:(key,value)=>values.set(key,value),
  };
}

describe("onboarding", ()=>{
  it("isolates persisted progress by user and role", ()=>{
    expect(onboardingStorageKey("one", "athlete")).not.toBe(onboardingStorageKey("two", "athlete"));
    expect(onboardingStorageKey("one", "athlete")).not.toBe(onboardingStorageKey("one", "trainer"));
  });

  it("merges progress and marks completion", ()=>{
    const storage = memoryStorage();
    const initial = readOnboardingState(storage, "one", "trainer");
    mergeOnboardingProgress(storage, "one", "trainer", initial, ["create-workout", "invite-athlete"]);
    const progressed = readOnboardingState(storage, "one", "trainer");
    expect(progressed.completedSteps).toEqual(["create-workout", "invite-athlete"]);
    finishOnboarding(storage, "one", "trainer", progressed);
    expect(readOnboardingState(storage, "one", "trainer").completed).toBe(true);
  });

  it("ignores corrupt storage safely", ()=>{
    const storage = {getItem:()=>"{broken", setItem:()=>{}};
    expect(readOnboardingState(storage, "one", "athlete")).toMatchObject({completed:false, completedSteps:[]});
  });

  it("derives role-specific progress without inventing data", ()=>{
    const trainer = trainerOnboardingSteps({hasWorkout:true, hasInvite:true, hasAssignment:false, hasSession:false});
    expect(trainer.filter(step=>step.done).map(step=>step.id)).toEqual(["create-workout", "register-student", "invite-athlete"]);
    const athlete = athleteOnboardingSteps({hasPendingInvite:true, hasTrainer:false, hasWorkout:true});
    expect(athlete.find(step=>step.id === "accept-invite")?.actionLabel).toBe("Responder convite");
    expect(athlete.find(step=>step.id === "start-workout")?.done).toBe(true);
  });
});
