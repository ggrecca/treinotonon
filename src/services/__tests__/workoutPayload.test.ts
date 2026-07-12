import { describe, expect, it } from "vitest";
import { buildPrescribedSets, buildSessionRpcPayload, buildWorkoutRpcPayload, workoutExerciseFromRow } from "../dataService/cloudDataService";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const BLOCK_ID = "33333333-3333-4333-8333-333333333333";

describe("payload transacional de treino", () => {
  it("gera séries progressivas sem metadados internos na descrição", () => {
    const payload = buildWorkoutRpcPayload({
      name:"Treino A",
      description:"Descrição limpa",
      objective:"Hipertrofia",
      frequency:"3x",
      weeklyFrequency:"3",
      notes:"Notas do treino",
      items:[{name:"Supino", type:"PROG", sets:"3", reps:"12 / 10 / 8", rest:"01:00"}],
    }, USER_ID);

    expect(payload.workout.description).toBe("Descrição limpa");
    expect(payload.workout.description).not.toContain("__TREINO_TONON_META__");
    expect(payload.exercises[0].prescribed_sets.map(set => set.target_reps)).toEqual(["12","10","8"]);
  });

  it("gera drops e rest-pause por série", () => {
    const drop = buildPrescribedSets({name:"Tríceps", type:"DROP SET", sets:"2", reps:"12 + 8"});
    expect(drop).toHaveLength(2);
    expect(drop[0].drops.map(item => item.target_reps)).toEqual(["12","8"]);

    const restPause = buildPrescribedSets({name:"Rosca", type:"REST PAUSE", sets:"2", reps:"10 + 4 + 3"});
    expect(restPause[1].drops.map(item => item.target_reps)).toEqual(["10","4","3"]);
  });

  it("grava conjugados nas colunas próprias e mantém notas limpas", () => {
    const payload = buildWorkoutRpcPayload({
      name:"Treino conjugado",
      type:"student",
      studentId:STUDENT_ID,
      items:[{
        name:"Supino",
        type:"CONJ",
        sets:"3",
        reps:"10",
        generalNotes:"Sem pausa entre A e B",
        conjugateBlockId:BLOCK_ID,
        conjugatePosition:1,
        conjugateKind:"Tri-set",
      }],
    }, USER_ID, STUDENT_ID);

    expect(payload.workout.owner_id).toBe(STUDENT_ID);
    expect(payload.workout.coach_id).toBe(USER_ID);
    expect(payload.exercises[0].conjugate_block_id).toBe(BLOCK_ID);
    expect(payload.exercises[0].conjugate_position).toBe(1);
    expect(payload.exercises[0].conjugate_kind).toBe("Tri-set");
    expect(payload.exercises[0].general_notes).toBe("Sem pausa entre A e B");
    expect(payload.exercises[0].general_notes).not.toContain("__TREINO_TONON_CONJUGATE__");
  });
  it("monta a sessão e as séries executadas para uma única RPC", () => {
    const payload = buildSessionRpcPayload({
      id:"55555555-5555-4555-8555-555555555555",
      userId:USER_ID,
      createdAt:"2026-07-11T10:00:00.000Z",
      updatedAt:"2026-07-11T10:30:00.000Z",
      date:"2026-07-11T10:00:00.000Z",
      workout:STUDENT_ID,
      workoutId:STUDENT_ID,
      items:[{
        exercise:"Supino",
        workoutExerciseId:"66666666-6666-4666-8666-666666666666",
        sets:[{reps:"12", load:"40", done:true, drops:[{reps:"8", load:"30", done:true}]}],
      }],
    }, USER_ID);

    expect(payload.session.workout_id).toBe(STUDENT_ID);
    expect(payload.items[0].sets[0].performed_reps).toBe("12");
    expect(payload.items[0].sets[0].drops[0].performed_reps).toBe("8");
    expect(payload.snapshotWorkout).toBeNull();
  });

  it("inclui snapshot na mesma RPC quando a sessão é legada", () => {
    const payload = buildSessionRpcPayload({
      id:"77777777-7777-4777-8777-777777777777",
      userId:USER_ID,
      createdAt:"2026-07-11T10:00:00.000Z",
      updatedAt:"2026-07-11T10:30:00.000Z",
      date:"2026-07-11T10:00:00.000Z",
      workout:"Treino antigo",
      workoutName:"Treino antigo",
      items:[{exercise:"Agachamento", planned:{sets:"3", reps:"12 / 10 / 8", type:"PROG"}, sets:[]}],
    }, USER_ID);

    expect(payload.session.workout_id).toBeNull();
    expect(payload.snapshotWorkout?.title).toBe("Treino antigo");
    expect(payload.items[0].workout_exercise_id).toBe(payload.snapshotExercises[0].id);
    expect(payload.snapshotExercises[0].prescribed_sets.map(set => set.target_reps)).toEqual(["12", "10", "8"]);
  });

  it("não duplica notas gerais legadas em orientações do treinador", () => {
    const exercise = workoutExerciseFromRow({
      id:"88888888-8888-4888-8888-888888888888",
      name:"Remada",
      method:"normal",
      sets:3,
      reps:"10",
      coach_notes:"",
      general_notes:"Observação geral",
      prescribed_sets:[],
    });
    expect(exercise.notes).toBe("");
    expect(exercise.generalNotes).toBe("Observação geral");
  });

  it("recarrega o tipo de conjugado salvo na coluna própria", () => {
    const exercise = workoutExerciseFromRow({
      id:"44444444-4444-4444-8444-444444444444",
      name:"Puxada",
      muscle_group:"Costas",
      method:"normal",
      sets:3,
      reps:"10",
      conjugate_block_id:BLOCK_ID,
      conjugate_position:2,
      conjugate_kind:"Circuito",
      general_notes:"Notas limpas",
      prescribed_sets:[],
    });

    expect(exercise.conjugateKind).toBe("Circuito");
    expect(exercise.conjugateBlockId).toBe(BLOCK_ID);
    expect(exercise.conjugatePosition).toBe(2);
    expect(exercise.generalNotes).toBe("Notas limpas");
  });

  it("persiste cargas diferentes em cada série progressiva", () => {
    const sets = buildPrescribedSets({
      name:"Supino",
      type:"PROG",
      sets:"3",
      reps:"12 / 10 / 8",
      targetRepsBySet:[{type:"text", label:"12"},{type:"text", label:"10"},{type:"text", label:"8"}],
      targetLoadsBySet:["40", "45", "50"],
    });
    expect(sets.map(set => set.target_reps)).toEqual(["12", "10", "8"]);
    expect(sets.map(set => set.target_load)).toEqual([40, 45, 50]);
  });

  it("persiste repetições e cargas próprias por série no drop set", () => {
    const sets = buildPrescribedSets({
      name:"Tríceps",
      type:"DROP SET",
      sets:"2",
      reps:"12 + 8",
      dropTargetsBySet:[
        [{reps:"12", load:"30"}, {reps:"8", load:"22"}],
        [{reps:"10", load:"28"}, {reps:"6", load:"20"}],
      ],
    });
    expect(sets[0].drops.map(drop => [drop.target_reps, drop.target_load])).toEqual([["12",30],["8",22]]);
    expect(sets[1].drops.map(drop => [drop.target_reps, drop.target_load])).toEqual([["10",28],["6",20]]);
  });

  it("recarrega cargas por série e por drop das colunas prescritas", () => {
    const exercise = workoutExerciseFromRow({
      id:"99999999-9999-4999-8999-999999999999",
      name:"Supino",
      method:"drop_set",
      sets:2,
      reps:"12 + 8",
      prescribed_sets:[
        {set_index:1,target_reps:"12 + 8",target_load:40,prescribed_drops:[{drop_index:1,target_reps:"12",target_load:40},{drop_index:2,target_reps:"8",target_load:30}]},
        {set_index:2,target_reps:"10 + 6",target_load:38,prescribed_drops:[{drop_index:1,target_reps:"10",target_load:38},{drop_index:2,target_reps:"6",target_load:28}]},
      ],
    });
    expect(exercise.targetLoadsBySet).toEqual(["40", "38"]);
    expect(exercise.dropTargetsBySet).toEqual([
      [{reps:"12",load:"40"},{reps:"8",load:"30"}],
      [{reps:"10",load:"38"},{reps:"6",load:"28"}],
    ]);
  });

});
