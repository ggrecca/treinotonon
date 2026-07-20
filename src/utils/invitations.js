export const INVITE_QUERY_KEY = "invite";
export const INVITE_EXPIRY_DAYS = 7;
export const INVITE_EXPIRY_MS = INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export const INVITE_STATUS_META = Object.freeze({
  pending:Object.freeze({status:"pending", label:"Pendente", tone:"warning", terminal:false}),
  accepted:Object.freeze({status:"accepted", label:"Aceito", tone:"success", terminal:true}),
  refused:Object.freeze({status:"refused", label:"Recusado", tone:"neutral", terminal:true}),
  cancelled:Object.freeze({status:"cancelled", label:"Cancelado", tone:"neutral", terminal:true}),
  expired:Object.freeze({status:"expired", label:"Expirado", tone:"warning", terminal:true}),
});

const DATABASE_STATUS_MAP = Object.freeze({
  pending:"pending",
  active:"accepted",
  refused:"refused",
  inactive:"cancelled",
});

const INVITE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function locationUrl(locationLike){
  if(!locationLike) return null;
  try {
    return new URL(locationLike.href || String(locationLike));
  } catch {
    return null;
  }
}

function dateTimestamp(value){
  if(value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : NaN;
  if(typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if(typeof value !== "string") return NaN;
  const text = value.trim();
  const calendarMatch = text.match(ISO_DATE_PATTERN);
  if(!calendarMatch) return NaN;
  const [, yearText, monthText, dayText] = calendarMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if(calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return NaN;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function inviteDetails(invite){
  if(invite && typeof invite === "object") {
    return {
      id:invite.inviteId || invite.id,
      coachName:String(invite.coachName || "").trim(),
      studentEmail:String(invite.studentEmail || invite.email || "").trim().toLowerCase(),
    };
  }
  return {id:invite, coachName:"", studentEmail:""};
}

export function normalizeInviteId(value){
  const raw = value && typeof value === "object" ? value.inviteId || value.id : value;
  const id = String(raw || "").trim().toLowerCase();
  return INVITE_ID_PATTERN.test(id) ? id : "";
}

export function deriveInviteExpiresAt(createdAt){
  const createdAtMs = dateTimestamp(createdAt);
  if(!Number.isFinite(createdAtMs)) return "";
  return new Date(createdAtMs + INVITE_EXPIRY_MS).toISOString();
}

export function isInviteExpired(createdAt, now=Date.now()){
  const createdAtMs = dateTimestamp(createdAt);
  const nowMs = dateTimestamp(now);
  if(!Number.isFinite(createdAtMs) || !Number.isFinite(nowMs)) return false;
  return nowMs >= createdAtMs + INVITE_EXPIRY_MS;
}

export function deriveInviteStatus(inviteOrStatus, now=Date.now()){
  const invite = inviteOrStatus && typeof inviteOrStatus === "object" ? inviteOrStatus : {status:inviteOrStatus};
  const databaseStatus = String(invite.status || "").trim().toLowerCase();
  const mappedStatus = DATABASE_STATUS_MAP[databaseStatus] || "";
  if(mappedStatus === "pending" && isInviteExpired(invite.updatedAt || invite.createdAt, now)) return "expired";
  return mappedStatus;
}

export function getInviteStatusMeta(inviteOrStatus, now=Date.now()){
  const status = deriveInviteStatus(inviteOrStatus, now);
  return status ? INVITE_STATUS_META[status] : null;
}

export function buildInviteDeepLink(invite, locationLike=globalThis.location){
  const inviteId = normalizeInviteId(invite);
  const url = locationUrl(locationLike);
  if(!inviteId || !url) return "";
  url.searchParams.set(INVITE_QUERY_KEY, inviteId);
  return url.toString();
}

export function readInviteDeepLink(locationLike=globalThis.location){
  const url = locationUrl(locationLike);
  if(!url) return {requested:false, inviteId:"", invalid:false};
  const requested = url.searchParams.has(INVITE_QUERY_KEY);
  if(!requested) return {requested:false, inviteId:"", invalid:false};
  const inviteId = normalizeInviteId(url.searchParams.get(INVITE_QUERY_KEY));
  return {requested:true, inviteId, invalid:!inviteId};
}

export function cleanInviteDeepLink(locationLike=globalThis.location){
  const url = locationUrl(locationLike);
  if(!url) return "";
  url.searchParams.delete(INVITE_QUERY_KEY);
  return `${url.pathname}${url.search}${url.hash}` || "/";
}

export function buildInviteShareText(invite, locationLike=globalThis.location){
  const details = inviteDetails(invite);
  const link = buildInviteDeepLink(details.id, locationLike);
  if(!link) return "";
  const introduction = details.coachName
    ? `${details.coachName} convidou você para acompanhar seus treinos no Treino Tonon.`
    : "Você recebeu um convite para acompanhar seus treinos no Treino Tonon.";
  return `${introduction}\n${link}`;
}

export function buildInviteMailtoHref(invite, locationLike=globalThis.location){
  const details = inviteDetails(invite);
  const body = buildInviteShareText(details, locationLike);
  if(!body) return "";
  const recipient = EMAIL_PATTERN.test(details.studentEmail) ? details.studentEmail : "";
  const subject = "Convite para o Treino Tonon";
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
