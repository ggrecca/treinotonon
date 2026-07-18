import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(()=>({
  resetPasswordForEmail:vi.fn(),
  updateUser:vi.fn(),
  onAuthStateChange:vi.fn(),
  unsubscribe:vi.fn(),
}));

vi.mock("../supabase/client", ()=>({
  supabase:{
    auth:{
      resetPasswordForEmail:mocks.resetPasswordForEmail,
      updateUser:mocks.updateUser,
      onAuthStateChange:mocks.onAuthStateChange,
    }
  },
  isSupabaseConfigured:true,
  isLocalModeEnabled:false,
  configurationError:"",
}));

import {supabaseAuthService} from "../authService/supabaseAuthService";

describe("Supabase password recovery service", ()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.resetPasswordForEmail.mockResolvedValue({error:null});
    mocks.updateUser.mockResolvedValue({data:{user:{id:"user-1"}}, error:null});
    mocks.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:mocks.unsubscribe}}});
  });

  it("sends the explicit redirect URL", async ()=>{
    await supabaseAuthService.resetPassword("pessoa@example.com", {redirectTo:"https://app.example.com/?auth=recovery"});
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("pessoa@example.com", {redirectTo:"https://app.example.com/?auth=recovery"});
  });

  it("updates only the password for the recovery session", async ()=>{
    await supabaseAuthService.updatePassword("senha-segura");
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    expect(mocks.updateUser).toHaveBeenCalledWith({password:"senha-segura"});
  });

  it("maps weak-password failures to a useful message", async ()=>{
    mocks.updateUser.mockResolvedValue({data:{user:null}, error:{code:"weak_password", message:"Password should be at least 8 characters"}});
    await expect(supabaseAuthService.updatePassword("curta")).rejects.toThrow(/8 caracteres/);
  });

  it("forwards PASSWORD_RECOVERY and unsubscribes on cleanup", ()=>{
    const listener = vi.fn();
    const cleanup = supabaseAuthService.onAuthStateChange(listener);
    const callback = mocks.onAuthStateChange.mock.calls[0][0];
    callback("PASSWORD_RECOVERY", {user:{id:"user-1"}});
    expect(listener).toHaveBeenCalledWith("PASSWORD_RECOVERY");
    cleanup();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
