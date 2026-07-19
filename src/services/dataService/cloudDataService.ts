import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../supabase/client";
import type {
  AppDataSnapshot,
  AppSettings,
  Athlete,
  BodyData,
  CoachStudent,
  DataService,
  DraftData,
  Exercise,
  RepTarget,
  Workout,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
} from "./types";

const DEFAULT_PROFILE = {name: "Usuario", age: ""};
const DEFAULT_TIMER_SECONDS = 50;
const THEME_STORAGE_KEY = "treino-tonon-theme";
const WORKOUT_META_PREFIX = "__TREINO_TONON_META__";
const CONJUGATE_KIND_PREFIX = "__CONJUGATE_KIND__:";
const CONJUGATE_META_PREFIX = "__TREINO_TONON_CONJUGATE__";

type JsonRecord = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random());
}

function isUuid(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function cleanTextArray(value: unknown): string[] {
  if(Array.isArray(value)) return value.map(item => cleanText(item)).filter(Boolean);
  const text = cleanText(value);
  return text ? text.split(",").map(item => cleanText(item)).filter(Boolean) : [];
}

function readWorkoutDescriptionPayload(value: unknown): {description: string; objective: string; frequency: string; weeklyFrequency: string; notes: string} {
  const raw = String(value || "");
  if(!raw.startsWith(WORKOUT_META_PREFIX)) {
    const description = cleanText(raw);
    return {description, objective:"", frequency:"", weeklyFrequency:"", notes:description};
  }
  const newline = raw.indexOf("\n");
  const metadataText = raw.slice(WORKOUT_META_PREFIX.length, newline >= 0 ? newline : undefined);
  const description = newline >= 0 ? cleanText(raw.slice(newline + 1)) : "";
  try {
    const metadata = JSON.parse(metadataText) as JsonRecord;
    return {
      description,
      objective:cleanText(metadata.objective),
      frequency:cleanText(metadata.frequency),
      weeklyFrequency:cleanText(metadata.weeklyFrequency || metadata.frequency),
      notes:cleanText(metadata.notes || description),
    };
  } catch {
    return {description, objective:"", frequency:"", weeklyFrequency:"", notes:description};
  }
}

function readWorkoutExerciseGeneralNotes(value: unknown): {generalNotes: string; conjugateKind: string; conjugateBlockId: string; conjugatePosition: number | null} {
  const raw = String(value || "");
  if(raw.startsWith(CONJUGATE_META_PREFIX)) {
    const newline = raw.indexOf("\n");
    const metadataText = raw.slice(CONJUGATE_META_PREFIX.length, newline >= 0 ? newline : undefined);
    try {
      const metadata = JSON.parse(metadataText) as JsonRecord;
      const position = Number(metadata.position);
      return {
        conjugateKind:cleanText(metadata.kind),
        conjugateBlockId:isUuid(metadata.blockId) ? cleanText(metadata.blockId) : "",
        conjugatePosition:Number.isInteger(position) && position > 0 ? position : null,
        generalNotes:newline >= 0 ? cleanText(raw.slice(newline + 1)) : "",
      };
    } catch {
      return {generalNotes:cleanText(raw), conjugateKind:"", conjugateBlockId:"", conjugatePosition:null};
    }
  }
  if(raw.startsWith(CONJUGATE_KIND_PREFIX)) {
    const newline = raw.indexOf("\n");
    return {
      conjugateKind:cleanText(raw.slice(CONJUGATE_KIND_PREFIX.length, newline >= 0 ? newline : undefined)),
      conjugateBlockId:"",
      conjugatePosition:null,
      generalNotes:newline >= 0 ? cleanText(raw.slice(newline + 1)) : "",
    };
  }
  return {generalNotes:cleanText(raw), conjugateKind:"", conjugateBlockId:"", conjugatePosition:null};
}

function readStoredTheme(): string {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "";
  } catch {
    return "";
  }
}

function normalizeEmail(value: unknown): string {
  return cleanText(value).toLowerCase();
}

function numericValue(value: unknown): number | null {
  const match = String(value || "").replace(",", ".").match(/\d+(\.\d+)?/);
  if(!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function clampSeconds(value: unknown): number {
  return Math.max(1, Math.min(3600, Number(value) || DEFAULT_TIMER_SECONDS));
}

function restToSeconds(value: unknown): number | null {
  const text = cleanText(value);
  const mmss = text.match(/^(\d{1,2}):(\d{2})$/);
  if(mmss) return clampSeconds(Number(mmss[1]) * 60 + Number(mmss[2]));
  const number = numericValue(text);
  return number ? clampSeconds(number) : null;
}

function secondsToRest(value: unknown): string {
  const seconds = Number(value);
  if(!seconds) return "00:50";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function toMillis(value: unknown): number | undefined {
  if(typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value || ""));
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toIsoFromMillis(value: unknown): string | null {
  const millis = Number(value);
  if(!millis) return null;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toIsoFromDateText(value: unknown): string | null {
  const text = cleanText(value);
  if(!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateLabel(value: unknown): string {
  const millis = toMillis(value);
  return millis ? new Date(millis).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR");
}

function roleForDb(role: unknown): "athlete" | "coach" {
  if(role === "coach" || role === "both" || role === "trainer" || role === "admin") return "coach";
  if(role === "athlete") return "athlete";
  return "athlete";
}

function appMethodToDb(value: unknown): string {
  const text = cleanText(value).toUpperCase();
  if(text === "PROG" || text === "PROGRESSIVO") return "progressive";
  if(text === "DROP SET") return "drop_set";
  if(text === "REST PAUSE") return "rest_pause";
  if(text === "CONJ") return "bi_set";
  if(text === "TRI SET") return "tri_set";
  if(text === "PIRAMIDE" || text === "PIRÂMIDE") return "pyramid";
  return "normal";
}

function dbMethodToApp(value: unknown): string {
  const text = cleanText(value);
  if(text === "progressive") return "PROG";
  if(text === "drop_set") return "DROP SET";
  if(text === "rest_pause") return "REST PAUSE";
  if(text === "bi_set") return "CONJ";
  if(text === "tri_set") return "TRI SET";
  if(text === "pyramid") return "PIRÂMIDE";
  return "NORMAL";
}

function repTargetLabel(target: unknown): string {
  if(isRecord(target)) return cleanText(target.label || target.value || "");
  return cleanText(target);
}

function textRepTarget(label: unknown): RepTarget | undefined {
  const text = cleanText(label);
  return text ? {type: "text", label: text} : undefined;
}

function plannedSetCount(value: unknown): number {
  return Math.max(1, Math.min(30, Math.round(numericValue(value) || 1)));
}

function splitRepTargets(reps: unknown): string[] {
  const text = cleanText(reps);
  if(!text) return [];
  return text.split("/").map(item => item.trim()).filter(Boolean);
}

function splitDropTargets(reps: unknown): string[] {
  const text = cleanText(reps);
  if(!text) return [];
  return text.split("+").map(item => item.trim()).filter(Boolean);
}

function requireClient() {
  if(!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase não está configurado. Verifique as variáveis de ambiente da publicação.");
  }
  return supabase;
}

async function requireUser(): Promise<User> {
  const client = requireClient();
  const {data, error} = await client.auth.getUser();
  if(error || !data.user) throw new Error("Sessão expirada. Entre novamente para continuar.");
  return data.user;
}

function throwSupabaseError(error: unknown, fallback: string): never {
  const message = isRecord(error) && typeof error.message === "string" ? error.message : fallback;
  throw new Error(message);
}

function userToAthlete(user: User, profile?: unknown): Athlete {
  const metadata = user.user_metadata || {};
  const row = isRecord(profile) ? profile : {};
  return {
    id: user.id,
    userId: user.id,
    createdAt: cleanText(row.created_at || user.created_at || nowIso()),
    updatedAt: cleanText(row.updated_at || user.updated_at || nowIso()),
    email: cleanText(row.email || user.email || ""),
    name: cleanText(row.name || metadata.name || user.email?.split("@")[0] || "Usuario"),
    role: roleForDb(row.role || metadata.role),
  };
}

function normalizeProfile(value: unknown, userId: string, email = ""): Partial<Athlete> {
  const profile: JsonRecord = isRecord(value) ? value : {...DEFAULT_PROFILE};
  return {
    ...profile,
    id: userId,
    userId,
    email: cleanText(profile.email || email),
    name: cleanText(profile.name || "Usuario"),
    age: cleanText(profile.age || ""),
    role: roleForDb(profile.role),
  };
}

function normalizeDraft(value: unknown, userId: string): DraftData {
  const draft = isRecord(value) ? value : {};
  return {...draft, userId};
}

async function getProfileMap(ids: string[]): Promise<Map<string, JsonRecord>> {
  const uniqueIds = Array.from(new Set(ids.filter(isUuid)));
  if(!uniqueIds.length) return new Map();
  const client = requireClient();
  const {data, error} = await client.from("profiles").select("*").in("id", uniqueIds);
  if(error) throwSupabaseError(error, "Nao foi possivel carregar perfis.");
  return new Map((data || []).map(row => [String(row.id), row as JsonRecord]));
}

function exerciseFromLibraryRow(row: JsonRecord): Exercise {
  const group = cleanText(row.primary_group || row.muscle_group || row.group || "Outro");
  const category = cleanText(row.category || row.muscle_group || row.group || "Outro");
  const secondaryGroups = cleanTextArray(row.secondary_groups);
  const equipmentList = cleanTextArray(row.equipment_list || row.equipment);
  const tags = cleanTextArray(row.tags);
  const technicalNotes = cleanText(row.technical_notes || row.notes || row.instructions || "");
  return {
    id: cleanText(row.id),
    userId: cleanText(row.owner_id),
    createdAt: cleanText(row.created_at || nowIso()),
    updatedAt: cleanText(row.updated_at || nowIso()),
    name: cleanText(row.name),
    group,
    muscleGroup: cleanText(row.muscle_group || group),
    category,
    primaryGroup: group,
    secondaryGroups,
    tags,
    rest: row.default_rest_seconds ? secondsToRest(row.default_rest_seconds) : "00:50",
    notes: cleanText(row.notes || row.instructions || ""),
    equipment: cleanText(row.equipment || ""),
    equipmentList,
    instructions: cleanText(row.instructions || ""),
    technicalNotes,
    isFavorite: !!row.is_favorite,
    lastUsedAt: row.last_used_at || "",
    sets: "3",
    reps: "10",
    load: "",
    type: "NORMAL",
    objective: "Hipertrofia",
  };
}

export function workoutExerciseFromRow(row: JsonRecord): WorkoutExercise {
  const prescribedSets = asArray<JsonRecord>(row.prescribed_sets).sort((a, b) => Number(a.set_index) - Number(b.set_index));
  const targetRepsBySet = prescribedSets
    .map(set => textRepTarget(set.target_reps))
    .filter(Boolean) as RepTarget[];
  const targetLoadsBySet = prescribedSets.map(set => set.target_load === null || set.target_load === undefined ? "" : cleanText(set.target_load));
  const dropTargetsBySet = prescribedSets.map(set => asArray<JsonRecord>(set.prescribed_drops)
    .sort((a, b) => Number(a.drop_index) - Number(b.drop_index))
    .map(drop => ({
      reps:cleanText(drop.target_reps || ""),
      load:drop.target_load === null || drop.target_load === undefined ? "" : cleanText(drop.target_load),
    })));
  const generalNotesPayload = readWorkoutExerciseGeneralNotes(row.general_notes);
  return {
    id: cleanText(row.id),
    workoutExerciseId: cleanText(row.id),
    name: cleanText(row.name),
    group: cleanText(row.muscle_group || "Outro"),
    type: dbMethodToApp(row.method),
    sets: cleanText(row.sets || "1"),
    reps: cleanText(row.reps || targetRepsBySet.map(repTargetLabel).join(" / ") || "10"),
    load: row.prescribed_load === null || row.prescribed_load === undefined ? "" : cleanText(row.prescribed_load),
    rest: row.rest_between_sets ? secondsToRest(row.rest_between_sets) : "00:50",
    notes: cleanText(row.coach_notes || ""),
    generalNotes:generalNotesPayload.generalNotes,
    targetRepsBySet,
    targetLoadsBySet,
    dropTargetsBySet,
    useRepTargetsBySet: targetRepsBySet.length > 1,
    exerciseId: cleanText(row.exercise_id || ""),
    restAfterExercise: row.rest_after_exercise || "",
    conjugateBlockId: cleanText(row.conjugate_block_id || generalNotesPayload.conjugateBlockId || ""),
    conjugatePosition: row.conjugate_position ? Number(row.conjugate_position) : generalNotesPayload.conjugatePosition,
    conjugateKind:cleanText(row.conjugate_kind || generalNotesPayload.conjugateKind || "Bi-set"),
  };
}

function workoutFromRow(row: JsonRecord, profileMap = new Map<string, JsonRecord>()): Workout {
  const exercises = asArray<JsonRecord>(row.workout_exercises)
    .sort((a, b) => Number(a.order_index) - Number(b.order_index))
    .map(workoutExerciseFromRow);
  const coach = profileMap.get(cleanText(row.coach_id));
  const student = profileMap.get(cleanText(row.student_id));
  const descriptionPayload = readWorkoutDescriptionPayload(row.description);
  return {
    id: cleanText(row.id),
    userId: cleanText(row.owner_id),
    createdAt: cleanText(row.created_at || nowIso()),
    updatedAt: cleanText(row.updated_at || nowIso()),
    name: cleanText(row.title || "Treino"),
    description: descriptionPayload.description,
    objective: cleanText(row.objective || descriptionPayload.objective),
    frequency: cleanText(row.frequency || descriptionPayload.frequency),
    weeklyFrequency: cleanText(row.weekly_frequency || row.frequency || descriptionPayload.weeklyFrequency || descriptionPayload.frequency),
    notes: cleanText(row.notes || descriptionPayload.notes || descriptionPayload.description),
    type: cleanText(row.type || "personal"),
    ownerId: cleanText(row.owner_id),
    coachId: cleanText(row.coach_id || ""),
    coachName: cleanText(coach?.name || ""),
    coachEmail: cleanText(coach?.email || ""),
    studentId: cleanText(row.student_id || ""),
    studentName: cleanText(student?.name || ""),
    studentEmail: cleanText(student?.email || ""),
    sourceWorkoutId: cleanText(row.source_workout_id || ""),
    sourceTemplateId: cleanText(row.source_workout_id || ""),
    isActive: row.is_active !== false,
    items: exercises,
  };
}

function nullableText(...values: unknown[]): string {
  const value = values.find(item => item !== null && item !== undefined);
  return value === null || value === undefined ? "" : cleanText(value);
}

function localDateKey(value = new Date()): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function bodyFromRow(row: JsonRecord): BodyData {
  return {
    id: cleanText(row.id),
    userId: cleanText(row.user_id),
    recordedBy: cleanText(row.recorded_by || row.coach_id || row.user_id || ""),
    createdAt: cleanText(row.created_at || nowIso()),
    updatedAt: cleanText(row.updated_at || nowIso()),
    date: cleanText(row.recorded_at || "").slice(0, 10) || localDateKey(),
    peso: nullableText(row.weight_kg, row.weight),
    sex: cleanText(row.sex || ""),
    bf: nullableText(row.body_fat_final, row.body_fat),
    bodyFatMethod: cleanText(row.body_fat_method || "manual"),
    bodyFatCalculated: row.body_fat_calculated === null || row.body_fat_calculated === undefined ? "" : cleanText(row.body_fat_calculated),
    bodyFatManual: row.body_fat_manual === null || row.body_fat_manual === undefined ? "" : cleanText(row.body_fat_manual),
    bodyFatFinal: nullableText(row.body_fat_final, row.body_fat),
    bodyDensity: row.body_density === null || row.body_density === undefined ? "" : cleanText(row.body_density),
    skinfoldSum: row.skinfold_sum_mm === null || row.skinfold_sum_mm === undefined ? "" : cleanText(row.skinfold_sum_mm),
    cintura: nullableText(row.waist_cm, row.waist),
    height: nullableText(row.height_cm, row.height),
    age: row.age === null || row.age === undefined ? "" : cleanText(row.age),
    neck: row.neck_cm === null || row.neck_cm === undefined ? "" : cleanText(row.neck_cm),
    shoulder: row.shoulder_cm === null || row.shoulder_cm === undefined ? "" : cleanText(row.shoulder_cm),
    hip: nullableText(row.hip_cm, row.hip),
    chest: nullableText(row.chest_cm, row.chest),
    abdomen: nullableText(row.abdomen_cm, row.abdomen),
    arm: nullableText(row.arm_cm, row.arm),
    forearm: row.forearm_cm === null || row.forearm_cm === undefined ? "" : cleanText(row.forearm_cm),
    thigh: nullableText(row.thigh_cm, row.thigh),
    calf: nullableText(row.calf_cm, row.calf),
    notes: cleanText(row.measurement_notes || row.notes || ""),
    skinfoldChest: nullableText(row.skinfold_chest_mm, row.skinfold_chest),
    skinfoldAbdominal: nullableText(row.skinfold_abdominal_mm, row.skinfold_abdominal),
    skinfoldThigh: nullableText(row.skinfold_thigh_mm, row.skinfold_thigh),
    skinfoldTriceps: nullableText(row.skinfold_triceps_mm, row.skinfold_triceps),
    skinfoldSubscapular: nullableText(row.skinfold_subscapular_mm, row.skinfold_subscapular),
    skinfoldSuprailiac: nullableText(row.skinfold_suprailiac_mm, row.skinfold_suprailiac),
    skinfoldMidaxillary: nullableText(row.skinfold_midaxillary_mm, row.skinfold_midaxillary),
    skinfoldCalf: nullableText(row.skinfold_calf_mm, row.skinfold_calf),
    skinfoldNotes: cleanText(row.skinfold_notes || ""),
    studentId: cleanText(row.student_id || ""),
    coachId: cleanText(row.coach_id || ""),
  };
}

function coachStudentFromRow(row: JsonRecord, profileMap = new Map<string, JsonRecord>()): CoachStudent {
  const coach = profileMap.get(cleanText(row.coach_id));
  const student = profileMap.get(cleanText(row.student_id));
  return {
    id: cleanText(row.id),
    userId: cleanText(row.coach_id),
    createdAt: cleanText(row.created_at || nowIso()),
    updatedAt: cleanText(row.updated_at || nowIso()),
    coachId: cleanText(row.coach_id),
    coachName: cleanText(coach?.name || ""),
    coachEmail: cleanText(coach?.email || ""),
    studentId: cleanText(row.student_id || ""),
    studentName: cleanText(student?.name || ""),
    studentEmail: normalizeEmail(row.student_email || student?.email),
    objective: cleanText(row.objective || ""),
    notes: cleanText(row.notes || ""),
    status: cleanText(row.status || "pending"),
    acceptedAt: row.accepted_at ? cleanText(row.accepted_at) : undefined,
    refusedAt: row.refused_at ? cleanText(row.refused_at) : undefined,
    inactiveAt: row.inactive_at ? cleanText(row.inactive_at) : undefined,
  };
}

function performedSetToWorkoutSet(row: JsonRecord, prescribedSet: JsonRecord = {}): WorkoutSet {
  const prescribedDrops = asArray<JsonRecord>(prescribedSet.prescribed_drops).sort((a, b) => Number(a.drop_index) - Number(b.drop_index));
  const drops = asArray<JsonRecord>(row.performed_drops)
    .sort((a, b) => Number(a.drop_index) - Number(b.drop_index))
    .map(drop => {
      const prescribedDrop = prescribedDrops.find(item => Number(item.drop_index) === Number(drop.drop_index)) || {};
      return {
        dropIndex: Number(drop.drop_index) - 1,
        load: drop.performed_load === null || drop.performed_load === undefined ? "" : cleanText(drop.performed_load),
        reps: cleanText(drop.performed_reps || ""),
        done: !!drop.completed,
        completed: !!drop.completed,
        prescribedDropId: cleanText(drop.prescribed_drop_id || ""),
        plannedLoad: prescribedDrop.target_load === null || prescribedDrop.target_load === undefined ? "" : cleanText(prescribedDrop.target_load),
        plannedReps: cleanText(prescribedDrop.target_reps || ""),
        plannedRepTarget: textRepTarget(prescribedDrop.target_reps) || null,
      };
    });
  const set: WorkoutSet = {
    load: row.performed_load === null || row.performed_load === undefined ? "" : cleanText(row.performed_load),
    reps: cleanText(row.performed_reps || ""),
    done: !!row.completed,
    completed: !!row.completed,
    prescribedSetId: cleanText(row.prescribed_set_id || ""),
    plannedLoad: prescribedSet.target_load === null || prescribedSet.target_load === undefined ? "" : cleanText(prescribedSet.target_load),
    plannedReps: cleanText(prescribedSet.target_reps || ""),
    plannedRepTarget: textRepTarget(prescribedSet.target_reps) || null,
  };
  if(drops.length) set.drops = drops;
  return set;
}

function sessionFromRows(session: JsonRecord, sets: JsonRecord[], workout?: JsonRecord, exercises = new Map<string, JsonRecord>(), profileMap = new Map<string, JsonRecord>()): WorkoutSession {
  const setsByExercise = new Map<string, JsonRecord[]>();
  sets.forEach(set => {
    const key = cleanText(set.workout_exercise_id);
    setsByExercise.set(key, [...(setsByExercise.get(key) || []), set]);
  });

  const items = Array.from(setsByExercise.entries()).map(([exerciseId, exerciseSets]) => {
    const exercise = exercises.get(exerciseId) || {};
    const sortedSets = exerciseSets.sort((a, b) => Number(a.set_index) - Number(b.set_index));
    const prescribedSets = asArray<JsonRecord>(exercise.prescribed_sets).sort((a, b) => Number(a.set_index) - Number(b.set_index));
    const prescribedByIndex = new Map(prescribedSets.map(set => [Number(set.set_index), set]));
    const performedSets = sortedSets.map(set => performedSetToWorkoutSet(set, prescribedByIndex.get(Number(set.set_index)) || {}));
    const reps = performedSets.reduce((sum, set) => {
      if(set.drops?.length) return sum + set.drops.reduce((dropSum, drop) => dropSum + (numericValue(drop.reps) || 0), 0);
      return sum + (numericValue(set.reps) || 0);
    }, 0);
    const volume = performedSets.reduce((sum, set) => {
      if(set.drops?.length) {
        return sum + set.drops.reduce((dropSum, drop) => dropSum + (numericValue(drop.load) || 0) * (numericValue(drop.reps) || 0), 0);
      }
      return sum + (numericValue(set.load) || 0) * (numericValue(set.reps) || 0);
    }, 0);
    return {
      id: exerciseId,
      exercise: cleanText(exercise.name || "Exercicio"),
      done: performedSets.length > 0 && performedSets.every(set => set.done),
      planned: {
        sets: cleanText(exercise.sets || ""),
        reps: cleanText(exercise.reps || ""),
        targetRepsBySet: prescribedSets.map(set => textRepTarget(set.target_reps)).filter(Boolean) as RepTarget[],
        targetLoadsBySet: prescribedSets.map(set => set.target_load === null || set.target_load === undefined ? "" : cleanText(set.target_load)),
        dropTargetsBySet: prescribedSets.map(set => asArray<JsonRecord>(set.prescribed_drops).sort((a,b)=>Number(a.drop_index)-Number(b.drop_index)).map(drop=>({reps:cleanText(drop.target_reps || ""), load:drop.target_load === null || drop.target_load === undefined ? "" : cleanText(drop.target_load)}))),
        type: dbMethodToApp(exercise.method),
        group: cleanText(exercise.muscle_group || "Outro"),
        rest: exercise.rest_between_sets ? secondsToRest(exercise.rest_between_sets) : "",
      },
      sets: performedSets,
      load: performedSets[0]?.load || "",
      reps: String(reps || ""),
      rpe: cleanText(sortedSets.find(set => set.rpe)?.rpe || ""),
      note: cleanText(sortedSets.find(set => set.student_notes)?.student_notes || exercise.coach_notes || ""),
      type: dbMethodToApp(exercise.method),
      group: cleanText(exercise.muscle_group || "Outro"),
      volume,
    } satisfies WorkoutSessionExercise;
  });

  const startedAt = toMillis(session.started_at) || Date.now();
  const finishedAt = toMillis(session.finished_at);
  const coachId = cleanText(session.coach_id || workout?.coach_id || "");
  const studentId = cleanText(session.student_id);
  const coach = profileMap.get(coachId);
  const student = profileMap.get(studentId);
  return {
    id: cleanText(session.id),
    userId: studentId,
    createdAt: cleanText(session.created_at || nowIso()),
    updatedAt: cleanText(session.updated_at || nowIso()),
    date: dateLabel(session.started_at),
    startedAt,
    endedAt: finishedAt,
    durationSeconds: Number(session.duration_seconds || 0),
    duration: session.duration_seconds ? formatDuration(Number(session.duration_seconds)) : "",
    workout: cleanText(session.workout_id),
    workoutId: cleanText(session.workout_id),
    workoutLabel: cleanText(workout?.title || "Treino"),
    workoutName: cleanText(workout?.title || "Treino"),
    workoutType: cleanText(workout?.type || ""),
    coachId,
    coachName: cleanText(coach?.name || ""),
    coachEmail: normalizeEmail(coach?.email),
    studentId,
    studentName: cleanText(student?.name || ""),
    studentEmail: normalizeEmail(student?.email),
    status: cleanText(session.status || "completed"),
    totalVolume: Number(session.total_volume || 0),
    volume: Number(session.total_volume || 0),
    completionPct: Number(session.completion_percentage || 0),
    totalExercises: items.length,
    completedExercises: items.filter(item => item.done).length,
    items,
  };
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function loadWorkoutRows(): Promise<JsonRecord[]> {
  const client = requireClient();
  const {data, error} = await client
    .from("workouts")
    .select("*, workout_exercises(*, prescribed_sets(*, prescribed_drops(*)))")
    .order("created_at", {ascending: false});
  if(error) throwSupabaseError(error, "Nao foi possivel carregar treinos.");
  return (data || []) as JsonRecord[];
}

async function findActiveStudentIdByEmail(coachId: string, email: string): Promise<string> {
  if(!email) return "";
  const client = requireClient();
  const {data, error} = await client
    .from("coach_students")
    .select("student_id")
    .eq("coach_id", coachId)
    .eq("student_email", normalizeEmail(email))
    .eq("status", "active")
    .maybeSingle();
  if(error) throwSupabaseError(error, "Nao foi possivel localizar o aluno vinculado.");
  return cleanText(data?.student_id || "");
}

export function buildPrescribedSets(exercise: WorkoutExercise): Array<{set_index: number; target_reps: string; target_load: number | null; rest_seconds: number | null; notes: string; drops: Array<{drop_index: number; target_reps: string; target_load: number | null; notes: string}>}> {
  const count = plannedSetCount(exercise.sets);
  const method = appMethodToDb(exercise.type);
  const explicitTargets = asArray(exercise.targetRepsBySet).map(repTargetLabel);
  const explicitLoads = asArray<string | number>(exercise.targetLoadsBySet).map(value => cleanText(value));
  const dropTargetsBySet = asArray<Array<{reps?: string; load?: string | number}>>(exercise.dropTargetsBySet);
  const segmentedMethod = method === "drop_set" || method === "rest_pause";
  const parsedTargets = segmentedMethod ? splitDropTargets(exercise.reps) : splitRepTargets(exercise.reps);
  const targets = explicitTargets.some(Boolean) ? explicitTargets : parsedTargets;
  const defaultTarget = cleanText(exercise.reps || "10");
  const defaultLoad = numericValue(exercise.load);
  const restSeconds = restToSeconds(exercise.rest);

  return Array.from({length: count}, (_, index) => {
    const target = targets[index] || targets[targets.length - 1] || defaultTarget;
    const configuredDrops = asArray<{reps?: string; load?: string | number}>(dropTargetsBySet[index]);
    const fallbackDrops = (parsedTargets.length ? parsedTargets : splitDropTargets(defaultTarget)).map(reps => ({reps, load:cleanText(exercise.load || "")}));
    const drops = segmentedMethod
      ? (configuredDrops.length ? configuredDrops : fallbackDrops).map((drop, dropIndex) => ({
        drop_index: dropIndex + 1,
        target_reps: cleanText(drop.reps || ""),
        target_load: numericValue(drop.load) ?? defaultLoad,
        notes: "",
      }))
      : [];
    const setLoad = numericValue(explicitLoads[index]) ?? defaultLoad;
    return {
      set_index: index + 1,
      target_reps: segmentedMethod ? drops.map(drop => drop.target_reps).join(" + ") : target,
      target_load: segmentedMethod ? (drops[0]?.target_load ?? defaultLoad) : setLoad,
      rest_seconds: restSeconds,
      notes: "",
      drops,
    };
  });
}

export function buildWorkoutRpcPayload(workout: Workout, userId: string, studentId = "") {
  const type = cleanText(workout.type || "personal") || "personal";
  const id = isUuid(workout.id) ? cleanText(workout.id) : makeId();
  const normalizedStudentId = type === "student" ? cleanText(studentId || workout.studentId) : "";
  const workoutRow = {
    id,
    title: cleanText(workout.name || "Treino"),
    description: cleanText(workout.description || ""),
    type,
    owner_id: type === "student" ? normalizedStudentId : userId,
    coach_id: type === "student" || type === "template" ? userId : null,
    student_id: type === "student" ? normalizedStudentId : null,
    source_workout_id: isUuid(workout.sourceWorkoutId || workout.sourceTemplateId) ? cleanText(workout.sourceWorkoutId || workout.sourceTemplateId) : null,
    is_active: workout.isActive !== false,
    objective: cleanText(workout.objective || ""),
    frequency: cleanText(workout.frequency || ""),
    weekly_frequency: cleanText(workout.weeklyFrequency || workout.frequency || ""),
    notes: cleanText(workout.notes || ""),
  };
  const exercises = asArray<WorkoutExercise>(workout.items).map((item, index) => {
    const workoutExerciseId = isUuid(item.workoutExerciseId)
      ? cleanText(item.workoutExerciseId)
      : isUuid(item.id) && cleanText(item.id) !== cleanText(item.exerciseId)
        ? cleanText(item.id)
        : makeId();
    return {
      id: workoutExerciseId,
      exercise_id: isUuid(item.exerciseId) ? cleanText(item.exerciseId) : null,
      order_index: index,
      name: cleanText(item.name || "Exercicio"),
      muscle_group: cleanText(item.group || "Outro"),
      method: appMethodToDb(item.type),
      sets: plannedSetCount(item.sets),
      reps: cleanText(item.reps || "10"),
      prescribed_load: numericValue(item.load),
      rest_between_sets: restToSeconds(item.rest),
      rest_after_exercise: restToSeconds(item.restAfterExercise),
      coach_notes: cleanText(item.notes || ""),
      general_notes: cleanText(item.generalNotes || item.general_notes || ""),
      conjugate_block_id: isUuid(item.conjugateBlockId) ? cleanText(item.conjugateBlockId) : null,
      conjugate_position: Number.isInteger(Number(item.conjugatePosition)) && Number(item.conjugatePosition) > 0 ? Number(item.conjugatePosition) : null,
      conjugate_kind: isUuid(item.conjugateBlockId) ? cleanText(item.conjugateKind || "Bi-set") : null,
      prescribed_sets: buildPrescribedSets(item),
    };
  });
  return {id, workout: workoutRow, exercises};
}

async function workoutHasExecutionHistory(workoutId: string): Promise<boolean> {
  const client = requireClient();
  const {data: exercises, error: exercisesError} = await client
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", workoutId);
  if(exercisesError) throwSupabaseError(exercisesError, "Nao foi possivel verificar o historico do treino.");
  const exerciseIds = asArray<JsonRecord>(exercises).map(row => cleanText(row.id)).filter(isUuid);
  if(!exerciseIds.length) return false;
  const {data, error} = await client
    .from("performed_sets")
    .select("id")
    .in("workout_exercise_id", exerciseIds)
    .limit(1);
  if(error) throwSupabaseError(error, "Nao foi possivel verificar o historico do treino.");
  return !!data?.length;
}

async function workoutHasSessionHistory(workoutId: string): Promise<boolean> {
  const client = requireClient();
  const {data, error} = await client
    .from("workout_sessions")
    .select("id")
    .eq("workout_id", workoutId)
    .limit(1);
  if(error) throwSupabaseError(error, "Nao foi possivel verificar sessoes do treino.");
  return !!data?.length;
}

async function workoutHasAssignedCopies(workoutId: string): Promise<boolean> {
  const client = requireClient();
  const {data, error} = await client
    .from("workouts")
    .select("id")
    .eq("source_workout_id", workoutId)
    .limit(1);
  if(error) throwSupabaseError(error, "Nao foi possivel verificar copias atribuidas do treino.");
  return !!data?.length;
}

function buildWorkoutSnapshotForSession(userId: string, session: WorkoutSession): Workout {
  return {
    id: makeId(),
    name: cleanText(session.workoutName || session.workoutLabel || session.workout || "Treino executado"),
    type: "personal",
    ownerId: userId,
    items: asArray<WorkoutSessionExercise>(session.items).map(item => {
      const workoutExerciseId = isUuid(item.workoutExerciseId || item.workout_exercise_id)
        ? cleanText(item.workoutExerciseId || item.workout_exercise_id)
        : makeId();
      return {
      id: workoutExerciseId,
      workoutExerciseId,
      name: cleanText(item.exercise || "Exercicio"),
      sets: cleanText(item.planned?.sets || item.sets?.length || "1"),
      reps: cleanText(item.planned?.reps || item.reps || "10"),
      load: cleanText(item.load || ""),
      rest: cleanText(item.planned?.rest || "00:50"),
      group: cleanText(item.group || item.planned?.group || "Outro"),
      type: cleanText(item.type || item.planned?.type || "NORMAL"),
      notes: cleanText(item.note || ""),
      targetRepsBySet: asArray<RepTarget>(item.planned?.targetRepsBySet),
      useRepTargetsBySet: asArray(item.planned?.targetRepsBySet).length > 0,
      };
    }),
  };
}

export function buildSessionRpcPayload(session: WorkoutSession, userId: string) {
  const requestedWorkoutId = cleanText(session.workoutId || session.workout);
  if(!isUuid(requestedWorkoutId) && cleanText(session.workoutType) === "student") {
    throw new Error("Sessão de treino enviado pelo treinador precisa usar o UUID real do treino prescrito.");
  }

  const sessionId = isUuid(session.id) ? session.id : makeId();
  const snapshotWorkout = isUuid(requestedWorkoutId) ? null : buildWorkoutSnapshotForSession(userId, session);
  const snapshotPayload = snapshotWorkout ? buildWorkoutRpcPayload(snapshotWorkout, userId) : null;
  const items = asArray<WorkoutSessionExercise>(session.items).map((item, index) => ({
    workout_exercise_id: isUuid(item.workoutExerciseId || item.workout_exercise_id)
      ? cleanText(item.workoutExerciseId || item.workout_exercise_id)
      : cleanText(snapshotPayload?.exercises[index]?.id || "") || null,
    exercise_name: cleanText(item.exercise || "Exercicio"),
    rpe: numericValue(item.rpe),
    student_notes: cleanText(item.note || ""),
    sets: asArray<WorkoutSet>(item.sets).map(set => ({
      id: isUuid(set.id) ? cleanText(set.id) : null,
      performed_reps: cleanText(set.reps || ""),
      performed_load: numericValue(set.load),
      completed: !!(set.done || set.completed),
      rest_seconds: restToSeconds(set.restSeconds),
      student_notes: cleanText(set.studentNotes || ""),
      drops: asArray<NonNullable<WorkoutSet["drops"]>[number]>(set.drops).map(drop => ({
        performed_reps: cleanText(drop.reps || ""),
        performed_load: numericValue(drop.load),
        completed: !!(drop.done || drop.completed),
      })),
    })),
  }));

  return {
    id: sessionId,
    session: {
      id: sessionId,
      workout_id: isUuid(requestedWorkoutId) ? requestedWorkoutId : null,
      coach_id: isUuid(session.coachId) ? session.coachId : null,
      started_at: toIsoFromMillis(session.startedAt) || toIsoFromDateText(session.date) || nowIso(),
      finished_at: toIsoFromMillis(session.endedAt) || nowIso(),
      duration_seconds: Number(session.durationSeconds || 0),
      status: cleanText(session.status || "completed"),
      total_volume: numericValue(session.volume || session.totalVolume),
      completion_percentage: numericValue(session.completionPct || session.completion_percentage),
      student_notes: cleanText(session.studentNotes || ""),
    },
    items,
    snapshotWorkout: snapshotPayload?.workout || null,
    snapshotExercises: snapshotPayload?.exercises || [],
  };
}

async function loadStoredSettings(userId: string): Promise<JsonRecord> {
  const client = requireClient();
  const {data, error} = await client
    .from("app_settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if(error) {
    const message = cleanText(error.message).toLowerCase();
    if(error.code === "42P01" || message.includes("app_settings") && message.includes("schema cache")) return {};
    throwSupabaseError(error, "Nao foi possivel carregar configuracoes.");
  }
  return isRecord(data?.data) ? data.data : {};
}

export const cloudDataService = {
  async getMode(): Promise<"cloud"> {
    await requireUser();
    return "cloud";
  },

  async getAthletes(): Promise<Athlete[]> {
    const user = await requireUser();
    const client = requireClient();
    const {data, error} = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if(error) throwSupabaseError(error, "Nao foi possivel carregar perfil.");
    return [userToAthlete(user, data || {})];
  },

  async saveAthlete(athlete: Athlete): Promise<void> {
    const user = await requireUser();
    const client = requireClient();
    const normalized = normalizeProfile(athlete, user.id, user.email || "");
    const {error} = await client.from("profiles").upsert({
      id: user.id,
      email: cleanText(normalized.email || user.email || ""),
      name: cleanText(normalized.name || "Usuario"),
      role: roleForDb(normalized.role),
    });
    if(error) throwSupabaseError(error, "Nao foi possivel salvar perfil.");
  },

  async deleteAthlete(id: string): Promise<void> {
    const user = await requireUser();
    if(id !== user.id) return;
    const client = requireClient();
    const {error} = await client.from("profiles").delete().eq("id", user.id);
    if(error) throwSupabaseError(error, "Nao foi possivel excluir perfil.");
  },

  async getExercises(): Promise<Exercise[]> {
    await requireUser();
    const client = requireClient();
    const {data, error} = await client
      .from("exercise_library")
      .select("*")
      .order("name", {ascending: true});
    if(error) throwSupabaseError(error, "Nao foi possivel carregar biblioteca de exercicios.");
    return (data || []).map(row => exerciseFromLibraryRow(row as JsonRecord));
  },

  async saveExercise(exercise: Exercise): Promise<void> {
    const user = await requireUser();
    const client = requireClient();
    const id = isUuid(exercise.id) ? cleanText(exercise.id) : makeId();
    const primaryGroup = cleanText(exercise.primaryGroup || exercise.muscleGroup || exercise.group || "Outro");
    const category = cleanText(exercise.category || exercise.muscleGroup || exercise.group || "Outro");
    const secondaryGroups = cleanTextArray(exercise.secondaryGroups || exercise.secondary_groups);
    const equipmentList = cleanTextArray(exercise.equipmentList || exercise.equipment_list || exercise.equipment);
    const tags = cleanTextArray(exercise.tags);
    const technicalNotes = cleanText(exercise.technicalNotes || exercise.technical_notes || exercise.notes || exercise.instructions || "");
    const {error} = await client.from("exercise_library").upsert({
      id,
      owner_id: user.id,
      name: cleanText(exercise.name || "Exercicio"),
      muscle_group: primaryGroup,
      category,
      primary_group: primaryGroup,
      secondary_groups: secondaryGroups,
      equipment_list: equipmentList,
      tags,
      equipment: cleanText(exercise.equipment || equipmentList.join(", ")),
      instructions: cleanText(exercise.instructions || ""),
      notes: cleanText(exercise.notes || ""),
      technical_notes: technicalNotes,
      default_rest_seconds: restToSeconds(exercise.rest),
      is_favorite: !!exercise.isFavorite,
      last_used_at: exercise.lastUsedAt || null,
    });
    if(error) throwSupabaseError(error, "Nao foi possivel salvar exercicio.");
  },

  async deleteExercise(id: string): Promise<void> {
    if(!isUuid(id)) return;
    const client = requireClient();
    const {error} = await client.from("exercise_library").delete().eq("id", id);
    if(error) throwSupabaseError(error, "Nao foi possivel excluir exercicio.");
  },

  async getWorkouts(): Promise<Workout[]> {
    await requireUser();
    const rows = await loadWorkoutRows();
    const profileMap = await getProfileMap(rows.flatMap(row => [cleanText(row.coach_id), cleanText(row.student_id)]));
    return rows.map(row => workoutFromRow(row, profileMap));
  },

  async saveWorkout(workout: Workout): Promise<void> {
    const user = await requireUser();
    const client = requireClient();
    const type = cleanText(workout.type || "personal") || "personal";
    const studentId = type === "student"
      ? cleanText(workout.studentId) || await findActiveStudentIdByEmail(user.id, cleanText(workout.studentEmail))
      : "";

    if(type === "student" && !isUuid(studentId)) {
      throw new Error("O aluno precisa aceitar o convite antes de receber treinos na nuvem.");
    }

    const payload = buildWorkoutRpcPayload(workout, user.id, studentId);
    const {error} = await client.rpc("save_workout_atomic", {
      p_workout: payload.workout,
      p_exercises: payload.exercises,
    });
    if(error) {
      const message = cleanText(error.message).toLowerCase();
      if(error.code === "PGRST202" || message.includes("save_workout_atomic") && message.includes("schema cache")) {
        throw new Error("O banco ainda não possui a função transacional de salvamento. Aplique a migration 202607110001_save_workout_atomic.sql no Supabase.");
      }
      throwSupabaseError(error, "Nao foi possivel salvar treino.");
    }
    workout.id = payload.id;
  },

  async deleteWorkout(id: string): Promise<void> {
    if(!isUuid(id)) return;
    const client = requireClient();
    if(await workoutHasSessionHistory(id) || await workoutHasExecutionHistory(id)) {
      throw new Error("Este treino ja possui historico e nao pode ser excluido. Voce pode arquiva-lo.");
    }
    if(await workoutHasAssignedCopies(id)) {
      throw new Error("Este treino possui copias atribuidas. Para preservar a origem das prescricoes, arquive o treino em vez de excluir.");
    }
    const {error} = await client.from("workouts").delete().eq("id", id);
    if(error) throwSupabaseError(error, "Nao foi possivel excluir treino.");
  },

  async getWorkoutHistory(): Promise<WorkoutSession[]> {
    await requireUser();
    const client = requireClient();
    const {data: sessions, error: sessionsError} = await client
      .from("workout_sessions")
      .select("*")
      .order("started_at", {ascending: false});
    if(sessionsError) throwSupabaseError(sessionsError, "Nao foi possivel carregar historico.");

    const sessionRows = (sessions || []) as JsonRecord[];
    if(!sessionRows.length) return [];
    const sessionIds = sessionRows.map(row => cleanText(row.id));
    const workoutIds = sessionRows.map(row => cleanText(row.workout_id)).filter(isUuid);

    const [{data: workouts, error: workoutsError}, {data: performedSets, error: setsError}] = await Promise.all([
      client.from("workouts").select("*").in("id", workoutIds.length ? workoutIds : ["00000000-0000-0000-0000-000000000000"]),
      client.from("performed_sets").select("*, performed_drops(*)").in("session_id", sessionIds),
    ]);
    if(workoutsError) throwSupabaseError(workoutsError, "Nao foi possivel carregar treinos do historico.");
    if(setsError) throwSupabaseError(setsError, "Nao foi possivel carregar execucao do historico.");

    const workoutMap = new Map((workouts || []).map(row => [cleanText(row.id), row as JsonRecord]));
    const exerciseIds = asArray<JsonRecord>(performedSets).map(row => cleanText(row.workout_exercise_id)).filter(isUuid);
    const {data: exercises, error: exercisesError} = await client
      .from("workout_exercises")
      .select("*, prescribed_sets(*, prescribed_drops(*))")
      .in("id", exerciseIds.length ? Array.from(new Set(exerciseIds)) : ["00000000-0000-0000-0000-000000000000"]);
    if(exercisesError) throwSupabaseError(exercisesError, "Nao foi possivel carregar exercicios do historico.");

    const exerciseMap = new Map((exercises || []).map(row => [cleanText(row.id), row as JsonRecord]));
    const setsBySession = new Map<string, JsonRecord[]>();
    asArray<JsonRecord>(performedSets).forEach(row => {
      const sessionId = cleanText(row.session_id);
      setsBySession.set(sessionId, [...(setsBySession.get(sessionId) || []), row]);
    });

    const profileMap = await getProfileMap(sessionRows.flatMap(row => [
      cleanText(row.student_id),
      cleanText(row.coach_id || workoutMap.get(cleanText(row.workout_id))?.coach_id),
    ]));
    return sessionRows.map(row => sessionFromRows(row, setsBySession.get(cleanText(row.id)) || [], workoutMap.get(cleanText(row.workout_id)), exerciseMap, profileMap));
  },

  async saveWorkoutSession(session: WorkoutSession): Promise<void> {
    const user = await requireUser();
    const client = requireClient();
    const payload = buildSessionRpcPayload(session, user.id);
    const {data, error} = await client.rpc("save_workout_session_atomic", {
      p_session: payload.session,
      p_items: payload.items,
      p_snapshot_workout: payload.snapshotWorkout,
      p_snapshot_exercises: payload.snapshotExercises,
    });
    if(error) {
      const message = cleanText(error.message).toLowerCase();
      if(error.code === "PGRST202" || message.includes("save_workout_session_atomic") && message.includes("schema cache")) {
        throw new Error("O banco ainda não possui o salvamento transacional de sessões. Aplique a migration 202607110003_session_settings_integrity.sql no Supabase.");
      }
      throwSupabaseError(error, "Nao foi possivel salvar a sessao de treino.");
    }
    session.id = cleanText((data as JsonRecord | null)?.session_id || payload.id);
    session.workoutId = cleanText((data as JsonRecord | null)?.workout_id || session.workoutId || "");
  },

  async deleteWorkoutSession(id: string): Promise<void> {
    if(!isUuid(id)) return;
    const client = requireClient();
    const {error} = await client.from("workout_sessions").delete().eq("id", id);
    if(error) throwSupabaseError(error, "Nao foi possivel excluir sessao de treino.");
  },

  async deleteBodyData(id: string): Promise<void> {
    if(!isUuid(id)) return;
    const client = requireClient();
    const {error} = await client.from("body_records").delete().eq("id", id);
    if(error) throwSupabaseError(error, "Nao foi possivel excluir dados corporais.");
  },

  async getCoachStudents(): Promise<CoachStudent[]> {
    const user = await requireUser();
    const client = requireClient();
    const email = normalizeEmail(user.email);
    const {data, error} = await client
      .from("coach_students")
      .select("*")
      .or(`coach_id.eq.${user.id},student_id.eq.${user.id},student_email.eq.${email}`)
      .order("created_at", {ascending: false});
    if(error) throwSupabaseError(error, "Nao foi possivel carregar alunos.");
    const rows = (data || []) as JsonRecord[];
    const profileMap = await getProfileMap(rows.flatMap(row => [cleanText(row.coach_id), cleanText(row.student_id)]));
    return rows.map(row => coachStudentFromRow(row, profileMap));
  },

  async saveCoachStudent(link: CoachStudent): Promise<void> {
    const user = await requireUser();
    const email = normalizeEmail(user.email);
    const studentEmail = normalizeEmail(link.studentEmail);
    const status = cleanText(link.status || "pending");

    if(link.adminEdit && cleanText(link.id) && cleanText(link.coachId) === user.id) {
      const client = requireClient();
      const {error} = await client
        .from("coach_students")
        .update({
          objective: cleanText(link.objective || ""),
          notes: cleanText(link.notes || ""),
        })
        .eq("id", link.id)
        .eq("coach_id", user.id);
      if(error) throwSupabaseError(error, "Nao foi possivel atualizar informacoes do aluno.");
      return;
    }

    if(status === "active" && studentEmail === email) {
      await cloudDataService.acceptCoachInvite(link);
      return;
    }
    if(status === "refused" && studentEmail === email) {
      await cloudDataService.refuseCoachInvite(link);
      return;
    }
    if(status === "inactive" && cleanText(link.coachId) === user.id) {
      await cloudDataService.deactivateCoachStudentLink(link);
      return;
    }
    if(status === "pending" && (!link.id || cleanText(link.coachId) === user.id)) {
      await cloudDataService.inviteStudentByEmail(link);
      return;
    }

    throw new Error("Use uma acao especifica para alterar vinculos de treinador e aluno.");
  },

  async inviteStudentByEmail(link: CoachStudent): Promise<CoachStudent> {
    const user = await requireUser();
    const client = requireClient();
    const id = isUuid(link.id) ? link.id : makeId();
    const studentEmail = normalizeEmail(link.studentEmail);
    const {data, error} = await client
      .from("coach_students")
      .insert({
        id,
        coach_id: user.id,
        student_email: studentEmail,
        objective: cleanText(link.objective || ""),
        notes: cleanText(link.notes || ""),
        status: "pending",
      })
      .select("*")
      .single();
    if(error) throwSupabaseError(error, "Nao foi possivel criar convite de aluno.");
    const profileMap = await getProfileMap([cleanText(data.coach_id), cleanText(data.student_id)]);
    return coachStudentFromRow(data as JsonRecord, profileMap);
  },

  async refreshCoachInvite(link: CoachStudent): Promise<CoachStudent> {
    const user = await requireUser();
    const client = requireClient();
    const inviteId = cleanText(link.id);
    if(!isUuid(inviteId)) throw new Error("Convite invalido. Recarregue a tela e tente novamente.");
    const {data, error} = await client
      .from("coach_students")
      .update({
        objective: cleanText(link.objective || ""),
        notes: cleanText(link.notes || ""),
      })
      .eq("id", inviteId)
      .eq("coach_id", user.id)
      .eq("status", "pending")
      .select("*")
      .single();
    if(error && cleanText(error.code) === "PGRST116") throw new Error("Convite pendente nao encontrado.");
    if(error) throwSupabaseError(error, "Nao foi possivel reenviar convite.");
    const profileMap = await getProfileMap([cleanText(data.coach_id), cleanText(data.student_id)]);
    return coachStudentFromRow(data as JsonRecord, profileMap);
  },

  async acceptCoachInvite(link: CoachStudent): Promise<CoachStudent> {
    const user = await requireUser();
    const client = requireClient();
    const email = normalizeEmail(user.email);
    const inviteId = cleanText(link.id);
    if(!isUuid(inviteId)) throw new Error("Convite invalido. Recarregue a tela e tente novamente.");
    const {data, error} = await client
      .from("coach_students")
      .update({
        student_id: user.id,
        status: "active",
      })
      .eq("id", inviteId)
      .eq("status", "pending")
      .eq("student_email", email)
      .select("*")
      .single();
    if(error && cleanText(error.code) === "PGRST116") throw new Error("Convite pendente nao encontrado para este email.");
    if(error) throwSupabaseError(error, "Nao foi possivel aceitar convite.");
    const profileMap = await getProfileMap([cleanText(data.coach_id), cleanText(data.student_id)]);
    return coachStudentFromRow(data as JsonRecord, profileMap);
  },

  async refuseCoachInvite(link: CoachStudent): Promise<CoachStudent> {
    const user = await requireUser();
    const client = requireClient();
    const email = normalizeEmail(user.email);
    const inviteId = cleanText(link.id);
    if(!isUuid(inviteId)) throw new Error("Convite invalido. Recarregue a tela e tente novamente.");
    const {data, error} = await client
      .from("coach_students")
      .update({
        student_id: user.id,
        status: "refused",
      })
      .eq("id", inviteId)
      .eq("status", "pending")
      .eq("student_email", email)
      .select("*")
      .single();
    if(error && cleanText(error.code) === "PGRST116") throw new Error("Convite pendente nao encontrado para este email.");
    if(error) throwSupabaseError(error, "Nao foi possivel recusar convite.");
    const profileMap = await getProfileMap([cleanText(data.coach_id), cleanText(data.student_id)]);
    return coachStudentFromRow(data as JsonRecord, profileMap);
  },

  async deactivateCoachStudentLink(link: CoachStudent): Promise<CoachStudent> {
    const user = await requireUser();
    const client = requireClient();
    const {data, error} = await client
      .from("coach_students")
      .update({status: "inactive"})
      .eq("id", link.id)
      .eq("coach_id", user.id)
      .in("status", ["pending", "active"])
      .select("*")
      .single();
    if(error) throwSupabaseError(error, "Nao foi possivel inativar vinculo.");
    const profileMap = await getProfileMap([cleanText(data.coach_id), cleanText(data.student_id)]);
    return coachStudentFromRow(data as JsonRecord, profileMap);
  },

  async deleteCoachStudent(id: string): Promise<void> {
    if(!isUuid(id)) return;
    const client = requireClient();
    const {error} = await client.from("coach_students").delete().eq("id", id);
    if(error) throwSupabaseError(error, "Nao foi possivel remover vinculo.");
  },

  async getSettings(): Promise<AppSettings | null> {
    const user = await requireUser();
    const [athletes, stored] = await Promise.all([this.getAthletes(), loadStoredSettings(user.id)]);
    return {
      ...stored,
      currentUserId: user.id,
      profile: athletes[0] || normalizeProfile({}, user.id, user.email || ""),
    } as AppSettings;
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    if(settings.profile) await this.saveAthlete(settings.profile as Athlete);
    const patch = Object.fromEntries(Object.entries(settings).filter(([key, value]) =>
      key !== "profile" && key !== "currentUserId" && value !== undefined
    ));
    if(!Object.keys(patch).length) return;
    const client = requireClient();
    const {error} = await client.rpc("patch_app_settings", {p_patch: patch});
    if(error) {
      const message = cleanText(error.message).toLowerCase();
      if(error.code === "PGRST202" || message.includes("patch_app_settings") && message.includes("schema cache")) {
        throw new Error("O banco ainda não possui a persistência de configurações. Aplique a migration 202607110003_session_settings_integrity.sql no Supabase.");
      }
      throwSupabaseError(error, "Nao foi possivel salvar configuracoes.");
    }
  },

  async saveAppData(data: Partial<AppDataSnapshot>): Promise<void> {
    const source = isRecord(data) ? data : {};
    if(Array.isArray(source.userLibrary)) {
      for(const exercise of source.userLibrary) await this.saveExercise(exercise);
    }
    if(Array.isArray(source.customWorkouts)) {
      for(const workout of source.customWorkouts) await this.saveWorkout(workout);
    }
    const history = Array.isArray(source.workoutSessions) ? source.workoutSessions : Array.isArray(source.sessions) ? source.sessions : [];
    for(const session of history) await this.saveWorkoutSession(session);
    if(Array.isArray(source.body)) await saveBodyData(source.body);
  },

  async getAppData(): Promise<AppDataSnapshot> {
    const user = await requireUser();
    const [userLibrary, customWorkouts, workoutSessions, body, athletes, coachStudents, storedSettings] = await Promise.all([
      this.getExercises(),
      this.getWorkouts(),
      this.getWorkoutHistory(),
      getBodyData(),
      this.getAthletes(),
      this.getCoachStudents().catch(() => []),
      loadStoredSettings(user.id),
    ]);
    const profile = athletes[0] || normalizeProfile({}, user.id, user.email || "");
    const sessions = workoutSessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      userId: session.userId,
      date: session.date,
      workout: session.workout,
      workoutLabel: session.workoutLabel,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      studentId: session.studentId,
      studentName: session.studentName,
      studentEmail: session.studentEmail,
      coachId: session.coachId,
      coachName: session.coachName,
      coachEmail: session.coachEmail,
      items: session.items,
    })) as WorkoutSession[];
    return {
      sessions,
      workoutSessions,
      body,
      draft: normalizeDraft({}, user.id),
      timerSetpoint: Number(storedSettings.timerSetpoint || DEFAULT_TIMER_SECONDS),
      autoStartRestTimer: storedSettings.autoStartRestTimer !== false,
      customWorkouts,
      editedBaseWorkouts: isRecord(storedSettings.editedBaseWorkouts) ? storedSettings.editedBaseWorkouts as Record<string, Workout> : {},
      hiddenBaseWorkouts: cleanTextArray(storedSettings.hiddenBaseWorkouts),
      hiddenCustomWorkouts: cleanTextArray(storedSettings.hiddenCustomWorkouts),
      profile,
      userLibrary,
      hiddenLibrary: cleanTextArray(storedSettings.hiddenLibrary),
      coachStudents,
      appMode: cleanText(storedSettings.appMode) || (profile.role === "coach" ? "treinador" : "atleta"),
      theme: cleanText(storedSettings.theme) || readStoredTheme() || "dark",
      currentUserId: user.id,
      authUser: user,
    };
  },

  async saveValue<K extends keyof AppDataSnapshot>(key: K, value: AppDataSnapshot[K]): Promise<void> {
    if(key === "body") {
      await saveBodyData(asArray(value));
      return;
    }
    if(key === "userLibrary") {
      for(const exercise of asArray<Exercise>(value)) await this.saveExercise(exercise);
      return;
    }
    if(key === "customWorkouts") {
      for(const workout of asArray<Workout>(value)) await this.saveWorkout(workout);
      return;
    }
    if(key === "workoutSessions" || key === "sessions") {
      for(const session of asArray<WorkoutSession>(value)) await this.saveWorkoutSession(session);
      return;
    }
    if(key === "profile") {
      await this.saveSettings({profile: value as Partial<Athlete>});
    }
  },

  async clearDraft(): Promise<void> {
    // Drafts are local-only in the v10 normalized cloud architecture.
  },
} satisfies DataService;

async function getBodyData(): Promise<BodyData[]> {
  await requireUser();
  const client = requireClient();
  const {data, error} = await client
    .from("body_records")
    .select("*")
    .order("recorded_at", {ascending: false});
  if(error) throwSupabaseError(error, "Nao foi possivel carregar dados corporais.");
  return (data || []).map(row => bodyFromRow(row as JsonRecord));
}

async function saveBodyData(body: BodyData[], replace = false): Promise<void> {
  const user = await requireUser();
  const client = requireClient();
  if(replace) {
    const {error: deleteError} = await client.from("body_records").delete().eq("user_id", user.id);
    if(deleteError) throwSupabaseError(deleteError, "Nao foi possivel substituir dados corporais.");
  }
  for(const item of body) {
    const id = isUuid(item.id) ? item.id : makeId();
    const targetStudentId = isUuid(item.studentId) ? cleanText(item.studentId) : user.id;
    const isCoachEntry = targetStudentId !== user.id;
    const {error} = await client.from("body_records").upsert({
      id,
      user_id: targetStudentId,
      student_id: targetStudentId,
      coach_id: isCoachEntry ? user.id : null,
      recorded_by: isUuid(item.recordedBy) ? cleanText(item.recordedBy) : user.id,
      weight: numericValue(item.peso || item.weight),
      weight_kg: numericValue(item.peso || item.weight),
      height: numericValue(item.height),
      height_cm: numericValue(item.height),
      age: numericValue(item.age),
      sex: cleanText(item.sex || ""),
      body_fat: numericValue(item.bf || item.bodyFat),
      body_fat_method: cleanText(item.bodyFatMethod || "manual"),
      body_fat_calculated: numericValue(item.bodyFatCalculated),
      body_fat_manual: numericValue(item.bodyFatManual),
      body_fat_final: numericValue(item.bodyFatFinal || item.bf || item.bodyFat),
      body_density: numericValue(item.bodyDensity),
      skinfold_sum_mm: numericValue(item.skinfoldSum),
      waist: numericValue(item.cintura || item.waist),
      waist_cm: numericValue(item.cintura || item.waist),
      neck_cm: numericValue(item.neck),
      shoulder_cm: numericValue(item.shoulder),
      hip: numericValue(item.hip),
      hip_cm: numericValue(item.hip),
      chest: numericValue(item.chest),
      chest_cm: numericValue(item.chest),
      abdomen: numericValue(item.abdomen),
      abdomen_cm: numericValue(item.abdomen),
      arm: numericValue(item.arm),
      arm_cm: numericValue(item.arm),
      forearm_cm: numericValue(item.forearm),
      thigh: numericValue(item.thigh),
      thigh_cm: numericValue(item.thigh),
      calf: numericValue(item.calf),
      calf_cm: numericValue(item.calf),
      notes: cleanText(item.notes || ""),
      measurement_notes: cleanText(item.notes || ""),
      skinfold_chest: numericValue(item.skinfoldChest || item.skinfold_chest),
      skinfold_chest_mm: numericValue(item.skinfoldChest || item.skinfold_chest),
      skinfold_abdominal: numericValue(item.skinfoldAbdominal || item.skinfold_abdominal),
      skinfold_abdominal_mm: numericValue(item.skinfoldAbdominal || item.skinfold_abdominal),
      skinfold_thigh: numericValue(item.skinfoldThigh || item.skinfold_thigh),
      skinfold_thigh_mm: numericValue(item.skinfoldThigh || item.skinfold_thigh),
      skinfold_triceps: numericValue(item.skinfoldTriceps || item.skinfold_triceps),
      skinfold_triceps_mm: numericValue(item.skinfoldTriceps || item.skinfold_triceps),
      skinfold_subscapular: numericValue(item.skinfoldSubscapular || item.skinfold_subscapular),
      skinfold_subscapular_mm: numericValue(item.skinfoldSubscapular || item.skinfold_subscapular),
      skinfold_suprailiac: numericValue(item.skinfoldSuprailiac || item.skinfold_suprailiac),
      skinfold_suprailiac_mm: numericValue(item.skinfoldSuprailiac || item.skinfold_suprailiac),
      skinfold_midaxillary: numericValue(item.skinfoldMidaxillary || item.skinfold_midaxillary),
      skinfold_midaxillary_mm: numericValue(item.skinfoldMidaxillary || item.skinfold_midaxillary),
      skinfold_calf: numericValue(item.skinfoldCalf || item.skinfold_calf),
      skinfold_calf_mm: numericValue(item.skinfoldCalf || item.skinfold_calf),
      skinfold_notes: cleanText(item.skinfoldNotes || item.skinfold_notes || ""),
      recorded_at: toIsoFromDateText(item.date) || nowIso(),
    });
    if(error) throwSupabaseError(error, "Nao foi possivel salvar dados corporais.");
  }
}
