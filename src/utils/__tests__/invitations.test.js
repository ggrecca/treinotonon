import {describe, expect, it} from "vitest";
import {
  INVITE_EXPIRY_DAYS,
  INVITE_EXPIRY_MS,
  buildInviteDeepLink,
  buildInviteMailtoHref,
  buildInviteShareText,
  cleanInviteDeepLink,
  deriveInviteExpiresAt,
  deriveInviteStatus,
  getInviteStatusMeta,
  isInviteExpired,
  normalizeInviteId,
  readInviteDeepLink,
} from "../invitations";

const inviteId = "5C2F2F4A-63AE-4D98-A264-15D92A311682";
const normalizedInviteId = inviteId.toLowerCase();
const createdAt = "2026-07-01T12:00:00.000Z";

describe("invitation helpers", ()=>{
  it("derives a seven-day expiry and treats the boundary as expired", ()=>{
    expect(INVITE_EXPIRY_DAYS).toBe(7);
    expect(INVITE_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(deriveInviteExpiresAt(createdAt)).toBe("2026-07-08T12:00:00.000Z");
    expect(isInviteExpired(createdAt, "2026-07-08T11:59:59.999Z")).toBe(false);
    expect(isInviteExpired(createdAt, "2026-07-08T12:00:00.000Z")).toBe(true);
  });

  it("rejects malformed dates without accidentally expiring an invitation", ()=>{
    expect(deriveInviteExpiresAt("2026-02-31T12:00:00Z")).toBe("");
    expect(deriveInviteExpiresAt("not-a-date")).toBe("");
    expect(isInviteExpired("not-a-date", Date.now())).toBe(false);
    expect(isInviteExpired(createdAt, "not-a-date")).toBe(false);
  });

  it("maps database states to presentation states and metadata", ()=>{
    const now = "2026-07-02T12:00:00.000Z";
    expect(deriveInviteStatus({status:"pending", createdAt}, now)).toBe("pending");
    expect(deriveInviteStatus({status:"active", createdAt}, now)).toBe("accepted");
    expect(deriveInviteStatus({status:"refused", createdAt}, now)).toBe("refused");
    expect(deriveInviteStatus({status:"inactive", createdAt}, now)).toBe("cancelled");
    expect(getInviteStatusMeta({status:"active", createdAt}, now)).toMatchObject({status:"accepted", label:"Aceito", terminal:true});
  });

  it("derives expired only from an old pending invitation", ()=>{
    const now = "2026-07-08T12:00:00.000Z";
    expect(deriveInviteStatus({status:"pending", createdAt}, now)).toBe("expired");
    expect(getInviteStatusMeta({status:"pending", createdAt}, now)).toMatchObject({status:"expired", label:"Expirado"});
    expect(deriveInviteStatus({status:"pending", createdAt:"invalid"}, now)).toBe("pending");
    expect(deriveInviteStatus({status:"unexpected", createdAt}, now)).toBe("");
    expect(getInviteStatusMeta({status:"unexpected", createdAt}, now)).toBeNull();
  });

  it("renews the expiry window from the last resend", ()=>{
    const now = "2026-07-10T12:00:00.000Z";
    expect(deriveInviteStatus({status:"pending", createdAt, updatedAt:"2026-07-09T12:00:00.000Z"}, now)).toBe("pending");
  });

  it("normalizes UUID invitation IDs and rejects malformed values", ()=>{
    expect(normalizeInviteId(inviteId)).toBe(normalizedInviteId);
    expect(normalizeInviteId({id:inviteId})).toBe(normalizedInviteId);
    expect(normalizeInviteId("../../invite")).toBe("");
    expect(normalizeInviteId("5c2f2f4a-63ae-4d98-a264")).toBe("");
  });

  it("builds, reads and cleans deep links while preserving unrelated URL state", ()=>{
    const location = {href:"https://app.example.com/treinos?from=email#athlete"};
    expect(buildInviteDeepLink(inviteId, location))
      .toBe(`https://app.example.com/treinos?from=email&invite=${normalizedInviteId}#athlete`);
    expect(readInviteDeepLink({href:`https://app.example.com/treinos?from=email&invite=${inviteId}#athlete`}))
      .toEqual({requested:true, inviteId:normalizedInviteId, invalid:false});
    expect(cleanInviteDeepLink({href:`https://app.example.com/treinos?from=email&invite=${inviteId}#athlete`}))
      .toBe("/treinos?from=email#athlete");
  });

  it("reports malformed deep links without returning their raw value", ()=>{
    expect(readInviteDeepLink({href:"https://app.example.com/?invite=%3Cscript%3E"}))
      .toEqual({requested:true, inviteId:"", invalid:true});
    expect(readInviteDeepLink({href:"https://app.example.com/?from=email"}))
      .toEqual({requested:false, inviteId:"", invalid:false});
    expect(buildInviteDeepLink("bad-id", {href:"https://app.example.com/"})).toBe("");
    expect(readInviteDeepLink({href:"not a url"})).toEqual({requested:false, inviteId:"", invalid:false});
  });

  it("builds share and email content from the same safe deep link", ()=>{
    const invite = {id:inviteId, coachName:"Ana Tonon", studentEmail:"aluno@example.com"};
    const location = {href:"https://app.example.com/?utm_source=coach#open"};
    const text = buildInviteShareText(invite, location);
    expect(text).toContain("Ana Tonon convidou você");
    expect(text).toContain(`https://app.example.com/?utm_source=coach&invite=${normalizedInviteId}#open`);

    const href = buildInviteMailtoHref(invite, location);
    expect(href).toMatch(/^mailto:aluno@example\.com\?/);
    expect(decodeURIComponent(href)).toContain("subject=Convite para o Treino Tonon");
    expect(decodeURIComponent(href)).toContain(text);
  });

  it("omits a malformed recipient and refuses content for an invalid invite ID", ()=>{
    const location = {href:"https://app.example.com/"};
    expect(buildInviteMailtoHref({id:inviteId, studentEmail:"not-an-email"}, location)).toMatch(/^mailto:\?/);
    expect(buildInviteShareText({id:"bad-id"}, location)).toBe("");
    expect(buildInviteMailtoHref({id:"bad-id", studentEmail:"aluno@example.com"}, location)).toBe("");
  });
});
