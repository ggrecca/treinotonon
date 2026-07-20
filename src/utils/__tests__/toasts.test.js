import {describe, expect, it} from "vitest";
import {createToast, enqueueToast, normalizeToastType, TOAST_DURATIONS} from "../toasts";

describe("semantic toasts", ()=>{
  it("defines a distinct duration for every supported variant", ()=>{
    expect(Object.keys(TOAST_DURATIONS)).toEqual(["success", "info", "warning", "error"]);
    expect(new Set(Object.values(TOAST_DURATIONS)).size).toBe(4);
    expect(createToast({message:"Tudo certo", type:"success"}, 10)).toMatchObject({type:"success", duration:3200, createdAt:10});
    expect(createToast({message:"Falhou", type:"error"}, 10).duration).toBeGreaterThan(TOAST_DURATIONS.warning);
  });

  it("normalizes unknown variants and honors an explicit persistent duration", ()=>{
    expect(normalizeToastType("danger")).toBe("info");
    expect(createToast({message:"Ação necessária", type:"warning", duration:0}, 20)).toMatchObject({type:"warning", duration:0});
  });

  it("deduplicates equal feedback and refreshes it at the end of the queue", ()=>{
    const first = enqueueToast([], {id:"a", message:"Salvo", type:"success"}, {now:10});
    const withOther = enqueueToast(first, {id:"b", message:"Atenção", type:"warning"}, {now:20});
    const result = enqueueToast(withOther, {id:"c", message:"Salvo", type:"success"}, {now:30});

    expect(result).toHaveLength(2);
    expect(result.at(-1)).toMatchObject({id:"a", message:"Salvo", count:2, createdAt:30});
  });

  it("keeps only the most recent notifications", ()=>{
    const result = [1,2,3,4,5].reduce(
      (queue, number)=>enqueueToast(queue, {id:String(number), message:`Aviso ${number}`, type:"info"}, {now:number, max:3}),
      [],
    );
    expect(result.map(item=>item.id)).toEqual(["3", "4", "5"]);
  });

  it("preserves stable IDs and optional retry actions when a notification repeats", ()=>{
    const retry = ()=>{};
    const first = enqueueToast([], {id:"stable", message:"Tente novamente", type:"error", duration:0, onRetry:retry}, {now:10});
    const repeated = enqueueToast(first, {id:"new-id", message:"Tente novamente", type:"error", duration:0, onRetry:retry}, {now:20});

    expect(repeated).toEqual([expect.objectContaining({id:"stable", count:2, duration:0, onRetry:retry, createdAt:20})]);
  });
});
