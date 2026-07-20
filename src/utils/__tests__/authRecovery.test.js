import {describe, expect, it} from "vitest";
import {buildPasswordRecoveryRedirect, cleanPasswordRecoveryUrl, readPasswordRecoveryLocation, validateNewPassword} from "../authRecovery";

describe("password recovery helpers", ()=>{
  it("builds an explicit recovery redirect without leaking auth fragments", ()=>{
    const redirect = buildPasswordRecoveryRedirect({href:"https://app.example.com/treinos?from=profile#access_token=secret&type=recovery"});
    expect(redirect).toBe("https://app.example.com/treinos?from=profile&auth=recovery");
    expect(redirect).not.toContain("secret");
  });

  it("recognizes implicit recovery returns without exposing tokens", ()=>{
    const state = readPasswordRecoveryLocation({href:"https://app.example.com/?auth=recovery#access_token=secret&type=recovery"});
    expect(state).toEqual({requested:true, errorCode:"", errorMessage:""});
    expect(JSON.stringify(state)).not.toContain("secret");
  });

  it("maps expired links to a safe retry message", ()=>{
    const state = readPasswordRecoveryLocation({href:"https://app.example.com/?auth=recovery#error_code=otp_expired&error_description=Token+has+expired"});
    expect(state.requested).toBe(true);
    expect(state.errorCode).toBe("otp_expired");
    expect(state.errorMessage).toContain("expirou");
    expect(state.errorMessage).not.toContain("Token has expired");
  });

  it("cleans only recovery parameters and preserves unrelated state", ()=>{
    expect(cleanPasswordRecoveryUrl({href:"https://app.example.com/treinos?from=profile&auth=recovery#error_code=otp_expired"}))
      .toBe("/treinos?from=profile");
  });

  it("validates required, length and confirmation", ()=>{
    expect(validateNewPassword("", "")).toMatch(/Informe/);
    expect(validateNewPassword("curta", "curta")).toMatch(/8 caracteres/);
    expect(validateNewPassword("senha-segura", "outra-senha")).toMatch(/não coincidem/);
    expect(validateNewPassword("senha-segura", "senha-segura")).toBe("");
  });
});
