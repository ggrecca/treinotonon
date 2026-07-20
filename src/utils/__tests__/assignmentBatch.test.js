import {describe, expect, it, vi} from "vitest";
import {executeAssignmentBatch, mergeAssignmentsById} from "../assignmentBatch";

const entry = (id, label=id)=>({key:id, label, copy:{id, name:`Treino ${label}`}});

describe("assignment batches", ()=>{
  it("attempts every destination and reports total success", async ()=>{
    const save = vi.fn().mockResolvedValue(undefined);
    const result = await executeAssignmentBatch([entry("a"), entry("b")], save);

    expect(save).toHaveBeenCalledTimes(2);
    expect(result.succeeded.map(item=>item.key)).toEqual(["a", "b"]);
    expect(result.failed).toEqual([]);
  });

  it("keeps successful destinations when one destination fails", async ()=>{
    const save = vi.fn(copy=>copy.id === "b" ? Promise.reject(new Error("Sem permissão")) : Promise.resolve());
    const result = await executeAssignmentBatch([entry("a", "Ana"), entry("b", "Bia"), entry("c", "Caio")], save);

    expect(save).toHaveBeenCalledTimes(3);
    expect(result.succeeded.map(item=>item.key)).toEqual(["a", "c"]);
    expect(result.failed).toEqual([expect.objectContaining({key:"b", label:"Bia", error:"Sem permissão", copy:{id:"b", name:"Treino Bia"}})]);
  });

  it("retries only failures with the same stable id and merges idempotently", async ()=>{
    const first = await executeAssignmentBatch([entry("a"), entry("b")], copy=>copy.id === "b" ? Promise.reject(new Error("Falha")) : Promise.resolve());
    const retry = await executeAssignmentBatch(first.failed, ()=>Promise.resolve());
    const stored = mergeAssignmentsById([], first.succeeded);
    const completed = mergeAssignmentsById(stored, retry.succeeded);
    const repeated = mergeAssignmentsById(completed, retry.succeeded);

    expect(retry.succeeded[0].copy.id).toBe("b");
    expect(completed.map(item=>item.id)).toEqual(["a", "b"]);
    expect(repeated).toHaveLength(2);
  });

  it("preserves multiple legacy workouts without ids while merging", ()=>{
    const merged = mergeAssignmentsById([{name:"Legado A"}, {name:"Legado B"}], [entry("new")]);
    expect(merged.map(item=>item.name)).toEqual(["Legado A", "Legado B", "Treino new"]);
  });
});
