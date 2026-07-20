import {describe, expect, it} from "vitest";
import {editorDraftKey, editorValuesDiffer, readEditorDraft, removeEditorDraft, writeEditorDraft} from "../editorDrafts";

function memoryStorage(){
  const values = new Map();
  return {
    getItem:key=>values.get(key) ?? null,
    setItem:(key,value)=>values.set(key,value),
    removeItem:key=>values.delete(key),
  };
}

describe("editor drafts", ()=>{
  it("isolates keys by user, scope and entity", ()=>{
    expect(editorDraftKey("user-a", "workout", "new")).not.toBe(editorDraftKey("user-b", "workout", "new"));
    expect(editorDraftKey("user-a", "workout", "one")).not.toBe(editorDraftKey("user-a", "workout", "two"));
  });

  it("compares editor values independently of object key order", ()=>{
    expect(editorValuesDiffer({name:"A", items:[{reps:"10", sets:"3"}]}, {items:[{sets:"3", reps:"10"}], name:"A"})).toBe(false);
    expect(editorValuesDiffer({name:"A"}, {name:"B"})).toBe(true);
  });

  it("persists, reads and removes a versioned draft", ()=>{
    const storage = memoryStorage();
    const key = editorDraftKey("user-a", "exercise", "new");
    expect(writeEditorDraft(storage, key, {name:"Supino"})).toBe(true);
    expect(readEditorDraft(storage, key)?.value).toEqual({name:"Supino"});
    removeEditorDraft(storage, key);
    expect(readEditorDraft(storage, key)).toBeNull();
  });

  it("ignores corrupt drafts safely", ()=>{
    const storage = memoryStorage();
    storage.setItem("bad", "{not-json");
    expect(readEditorDraft(storage, "bad")).toBeNull();
  });
});
