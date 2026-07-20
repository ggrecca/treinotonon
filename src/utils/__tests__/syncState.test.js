import {describe, expect, it} from "vitest";
import {canRunRemoteMutation, deriveSyncState} from "../syncState";

const base = {isCloud:true, online:true, bootstrapState:"loaded", retrying:false, pendingCount:0, hasSafeData:true};

describe("global sync state", ()=>{
  it("covers initial loading, loaded, error, retry and pending sync", ()=>{
    expect(deriveSyncState({...base, bootstrapState:"loading", hasSafeData:false})).toBe("loading");
    expect(deriveSyncState(base)).toBe("loaded");
    expect(deriveSyncState({...base, bootstrapState:"error"})).toBe("load-error");
    expect(deriveSyncState({...base, retrying:true})).toBe("retrying");
    expect(deriveSyncState({...base, pendingCount:2})).toBe("pending-sync");
  });

  it("keeps offline separate from cloud/local mode", ()=>{
    expect(deriveSyncState({...base, online:false})).toBe("offline");
    expect(deriveSyncState({...base, isCloud:false, online:false})).toBe("loaded");
  });

  it("blocks remote mutations while state is unknown, retrying or offline", ()=>{
    expect(canRunRemoteMutation(base)).toBe(true);
    expect(canRunRemoteMutation({...base, bootstrapState:"loading"})).toBe(false);
    expect(canRunRemoteMutation({...base, retrying:true})).toBe(false);
    expect(canRunRemoteMutation({...base, online:false})).toBe(false);
    expect(canRunRemoteMutation({...base, isCloud:false, online:false})).toBe(true);
  });
});
