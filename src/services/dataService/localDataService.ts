import type {
  AppDataSnapshot,
  AppSettings,
  Athlete,
  DataService,
  Exercise,
  CoachStudent,
  Workout,
  WorkoutSession,
} from "./types";

const KEYS = {
  athletes: "athletes",
  sessions: "sessions",
  workoutSessions: "workoutSessions",
  body: "body",
  draft: "draft",
  timerSetpoint: "timerSetpoint",
  autoStartRestTimer: "autoStartRestTimer",
  customWorkouts: "customWorkouts",
  editedBaseWorkouts: "editedBaseWorkouts",
  hiddenBaseWorkouts: "hiddenBaseWorkouts",
  hiddenCustomWorkouts: "hiddenCustomWorkouts",
  profile: "profile",
  userLibrary: "userLibrary",
  hiddenLibrary: "hiddenLibrary",
  coachStudents: "coachStudents",
  appMode: "appMode",
  theme: "theme",
  currentUserId: "currentUserId",
  authUser: "authUser",
} as const;

function localDateKey(value = new Date()): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

const DEFAULT_PROFILE = {name: "Usuario", age: ""};
const LOCAL_USER_ID = "local-user";

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the app usable if storage quota or private mode blocks persistence.
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures during recovery flows.
  }
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function cleanTextArray(value: unknown): string[] {
  if(Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  return text ? text.split(",").map(item => item.trim()).filter(Boolean) : [];
}

function clampSeconds(value: unknown): number {
  return Math.max(1, Math.min(3600, Number(value) || 50));
}

function withEntityFields<T extends Record<string, unknown>>(value: T): T & {id: string; createdAt: string; updatedAt: string} {
  const timestamp = nowIso();
  const id = String(value.id || makeId());
  const createdAt = String(value.createdAt || value.date || timestamp);
  const updatedAt = String(value.updatedAt || timestamp);
  const userId = String(value.userId || LOCAL_USER_ID);
  return {...value, id, createdAt, updatedAt, userId};
}

function normalizeExercise(value: unknown): Exercise {
  const item = isRecord(value) ? value : {};
  const primaryGroup = String(item.primaryGroup || item.primary_group || item.muscleGroup || item.muscle_group || item.group || "Outro");
  const category = String(item.category || item.muscleGroup || item.muscle_group || item.group || "Outro");
  const secondaryGroups = cleanTextArray(item.secondaryGroups || item.secondary_groups);
  const equipmentList = cleanTextArray(item.equipmentList || item.equipment_list || item.equipment);
  const tags = cleanTextArray(item.tags);
  const technicalNotes = String(item.technicalNotes || item.technical_notes || item.notes || item.instructions || "");
  return withEntityFields({
    ...item,
    userId: String(item.userId || LOCAL_USER_ID),
    name: String(item.name || ""),
    sets: String(item.sets || "3"),
    reps: String(item.reps || "10"),
    load: String(item.load || ""),
    rest: String(item.rest || "00:50"),
    group: primaryGroup,
    muscleGroup: String(item.muscleGroup || item.muscle_group || primaryGroup),
    category,
    primaryGroup,
    secondaryGroups,
    equipmentList,
    equipment: String(item.equipment || equipmentList.join(", ")),
    tags,
    type: String(item.type || "NORMAL"),
    objective: String(item.objective || "Hipertrofia"),
    notes: String(item.notes || ""),
    technicalNotes,
  });
}

function normalizeWorkout(value: unknown): Workout {
  const workout = isRecord(value) ? value : {};
  return withEntityFields({
    ...workout,
    name: String(workout.name || "Treino"),
    items: asArray(workout.items).map(normalizeExercise),
    type: String(workout.type || "personal"),
    sourceWorkoutId: String(workout.sourceWorkoutId || workout.source_workout_id || workout.sourceTemplateId || ""),
    isActive: workout.isActive !== false,
  });
}

function normalizeCoachStudent(value: unknown): CoachStudent {
  const link = isRecord(value) ? value : {};
  return withEntityFields({
    ...link,
    coachId: String(link.coachId || link.coach_id || LOCAL_USER_ID),
    coachName: String(link.coachName || link.coach_name || ""),
    coachEmail: String(link.coachEmail || link.coach_email || "").toLowerCase(),
    studentId: link.studentId || link.student_id ? String(link.studentId || link.student_id) : "",
    studentName: String(link.studentName || link.student_name || ""),
    studentEmail: String(link.studentEmail || link.student_email || "").trim().toLowerCase(),
    objective: String(link.objective || ""),
    notes: String(link.notes || ""),
    status: String(link.status || "pending"),
  }) as CoachStudent;
}

function normalizeWorkoutSession(value: unknown): WorkoutSession {
  const session = isRecord(value) ? value : {};
  return withEntityFields({
    ...session,
    date: String(session.date || new Date().toLocaleString("pt-BR")),
    workout: String(session.workout || session.workoutId || ""),
    workoutLabel: session.workoutLabel ? String(session.workoutLabel) : undefined,
    workoutId: session.workoutId ? String(session.workoutId) : String(session.workout || ""),
    workoutName: session.workoutName ? String(session.workoutName) : session.workoutLabel ? String(session.workoutLabel) : String(session.workout || "Treino"),
    items: asArray(session.items).map(item => {
      const row = isRecord(item) ? item : {};
      return {
        ...row,
        userId: String(row.userId || session.userId || LOCAL_USER_ID),
        exercise: String(row.exercise || row.name || ""),
        done: !!row.done,
        sets: asArray(row.sets),
      };
    }),
  });
}

function normalizeProfile(value: unknown): Partial<Athlete> {
  const profile: Record<string, unknown> = isRecord(value) ? value : {...DEFAULT_PROFILE};
  return {...profile, userId: String(profile.userId || LOCAL_USER_ID), name: String(profile.name || "Usuario"), age: String(profile.age || "")};
}

function normalizeBodyItem(value: unknown): Record<string, unknown> {
  const item = isRecord(value) ? value : {};
  return withEntityFields({
    ...item,
    date: String(item.date || localDateKey()),
    userId: String(item.userId || LOCAL_USER_ID),
  });
}

function normalizeDraft(value: unknown): Record<string, unknown> {
  const draft = isRecord(value) ? value : {};
  return {...draft, userId: String(draft.userId || LOCAL_USER_ID)};
}

function normalizeSnapshot(data: unknown): AppDataSnapshot {
  const source = isRecord(data) ? data : {};
  return {
    sessions: asArray(source.sessions).map(normalizeWorkoutSession),
    workoutSessions: asArray(source.workoutSessions).map(normalizeWorkoutSession),
    body: asArray(source.body).map(normalizeBodyItem),
    draft: normalizeDraft(source.draft),
    timerSetpoint: clampSeconds(source.timerSetpoint),
    autoStartRestTimer: source.autoStartRestTimer !== false,
    customWorkouts: asArray(source.customWorkouts).map(normalizeWorkout),
    editedBaseWorkouts: Object.fromEntries(
      Object.entries(isRecord(source.editedBaseWorkouts) ? source.editedBaseWorkouts : {})
        .map(([key, workout]) => [key, normalizeWorkout(workout)])
    ),
    hiddenBaseWorkouts: asArray(source.hiddenBaseWorkouts).map(String),
    hiddenCustomWorkouts: asArray(source.hiddenCustomWorkouts).map(String),
    profile: normalizeProfile(source.profile),
    userLibrary: asArray(source.userLibrary).map(normalizeExercise),
    hiddenLibrary: asArray(source.hiddenLibrary).map(String),
    coachStudents: asArray(source.coachStudents).map(normalizeCoachStudent),
    appMode: String(source.appMode || "atleta"),
    theme: String(source.theme || "dark"),
    currentUserId: String(source.currentUserId || LOCAL_USER_ID),
    authUser: source.authUser,
  };
}

function readSnapshot(): AppDataSnapshot {
  return normalizeSnapshot({
    sessions: readJson(KEYS.sessions, []),
    workoutSessions: readJson(KEYS.workoutSessions, []),
    body: readJson(KEYS.body, []),
    draft: readJson(KEYS.draft, {}),
    timerSetpoint: readJson(KEYS.timerSetpoint, 50),
    autoStartRestTimer: readJson(KEYS.autoStartRestTimer, true),
    customWorkouts: readJson(KEYS.customWorkouts, []),
    editedBaseWorkouts: readJson(KEYS.editedBaseWorkouts, {}),
    hiddenBaseWorkouts: readJson(KEYS.hiddenBaseWorkouts, []),
    hiddenCustomWorkouts: readJson(KEYS.hiddenCustomWorkouts, []),
    profile: readJson(KEYS.profile, DEFAULT_PROFILE),
    userLibrary: readJson(KEYS.userLibrary, []),
    hiddenLibrary: readJson(KEYS.hiddenLibrary, []),
    coachStudents: readJson(KEYS.coachStudents, []),
    appMode: readJson(KEYS.appMode, "atleta"),
    theme: readJson(KEYS.theme, "dark"),
    currentUserId: readJson(KEYS.currentUserId, LOCAL_USER_ID),
    authUser: readJson(KEYS.authUser, null),
  });
}

function writeSnapshot(snapshot: AppDataSnapshot): void {
  writeJson(KEYS.sessions, snapshot.sessions);
  writeJson(KEYS.workoutSessions, snapshot.workoutSessions);
  writeJson(KEYS.body, snapshot.body);
  writeJson(KEYS.draft, snapshot.draft);
  writeJson(KEYS.timerSetpoint, snapshot.timerSetpoint);
  writeJson(KEYS.autoStartRestTimer, snapshot.autoStartRestTimer);
  writeJson(KEYS.customWorkouts, snapshot.customWorkouts);
  writeJson(KEYS.editedBaseWorkouts, snapshot.editedBaseWorkouts);
  writeJson(KEYS.hiddenBaseWorkouts, snapshot.hiddenBaseWorkouts);
  writeJson(KEYS.hiddenCustomWorkouts, snapshot.hiddenCustomWorkouts);
  writeJson(KEYS.profile, snapshot.profile);
  writeJson(KEYS.userLibrary, snapshot.userLibrary);
  writeJson(KEYS.hiddenLibrary, snapshot.hiddenLibrary);
  writeJson(KEYS.coachStudents, snapshot.coachStudents);
  writeJson(KEYS.appMode, snapshot.appMode);
  writeJson(KEYS.theme, snapshot.theme);
  writeJson(KEYS.currentUserId, snapshot.currentUserId || LOCAL_USER_ID);
  if(snapshot.authUser) writeJson(KEYS.authUser, snapshot.authUser);
}

export const localDataService = {
  async getMode(): Promise<"local"> {
    return "local";
  },

  async getAthletes(): Promise<Athlete[]> {
    const athletes = readJson<unknown[]>(KEYS.athletes, []);
    const profile = normalizeProfile(readJson(KEYS.profile, DEFAULT_PROFILE));
    const normalizedAthletes = asArray(athletes).map(item => withEntityFields(normalizeProfile(item) as Record<string, unknown>) as Athlete);
    if(normalizedAthletes.length) return normalizedAthletes;
    return [withEntityFields(profile as Record<string, unknown>) as Athlete];
  },

  async saveAthlete(athlete: Athlete): Promise<void> {
    const athletes = await this.getAthletes();
    const normalized = withEntityFields(athlete as unknown as Record<string, unknown>) as Athlete;
    writeJson(KEYS.athletes, [...athletes.filter(item => item.id !== normalized.id), normalized]);
    writeJson(KEYS.profile, normalized);
  },

  async deleteAthlete(id: string): Promise<void> {
    const athletes = (await this.getAthletes()).filter(item => item.id !== id);
    writeJson(KEYS.athletes, athletes);
  },

  async getExercises(): Promise<Exercise[]> {
    return asArray(readJson(KEYS.userLibrary, [])).map(normalizeExercise);
  },

  async saveExercise(exercise: Exercise): Promise<void> {
    const normalized = normalizeExercise(exercise);
    const normalizedId = String(normalized.id || "").toLowerCase();
    const normalizedName = String(normalized.name || "").toLowerCase();
    const exercises = (await this.getExercises()).filter(item => {
      const itemId = String(item.id || "").toLowerCase();
      const itemName = String(item.name || "").toLowerCase();
      if(normalizedId && itemId === normalizedId) return false;
      if(itemName === normalizedName) return false;
      return true;
    });
    writeJson(KEYS.userLibrary, [...exercises, normalized].sort((a, b) => a.name.localeCompare(b.name)));
  },

  async deleteExercise(id: string): Promise<void> {
    const key = String(id || "").toLowerCase();
    const exercises = (await this.getExercises()).filter(item => String(item.id || item.name || "").toLowerCase() !== key);
    writeJson(KEYS.userLibrary, exercises);
  },

  async getWorkouts(): Promise<Workout[]> {
    return readSnapshot().customWorkouts;
  },

  async saveWorkout(workout: Workout): Promise<void> {
    const normalized = normalizeWorkout(workout);
    const workouts = await this.getWorkouts();
    const exists = workouts.some(item => item.id === normalized.id);
    writeJson(KEYS.customWorkouts, exists
      ? workouts.map(item => item.id === normalized.id ? normalized : item)
      : [...workouts, normalized]
    );
  },

  async deleteWorkout(id: string): Promise<void> {
    const workouts = (await this.getWorkouts()).filter(item => item.id !== id);
    writeJson(KEYS.customWorkouts, workouts);
  },

  async getWorkoutHistory(): Promise<WorkoutSession[]> {
    return readSnapshot().workoutSessions;
  },

  async saveWorkoutSession(session: WorkoutSession): Promise<void> {
    const snapshot = readSnapshot();
    const normalized = normalizeWorkoutSession(session);
    const history = snapshot.workoutSessions.filter(item => item.id !== normalized.id);
    const legacy = {
      id: normalized.id,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
      date: normalized.date,
      workout: normalized.workout,
      workoutLabel: normalized.workoutLabel,
      items: normalized.items,
    };
    snapshot.workoutSessions = [normalized, ...history];
    snapshot.sessions = [legacy, ...snapshot.sessions.filter(item => item.id !== normalized.id)].map(normalizeWorkoutSession);
    writeSnapshot(snapshot);
  },

  async deleteWorkoutSession(id: string): Promise<void> {
    const snapshot = readSnapshot();
    snapshot.workoutSessions = snapshot.workoutSessions.filter(item => item.id !== id);
    snapshot.sessions = snapshot.sessions.filter(item => item.id !== id);
    writeSnapshot(snapshot);
  },

  async deleteBodyData(id: string): Promise<void> {
    const key = String(id || "").toLowerCase();
    if(!key) return;
    const snapshot = readSnapshot();
    snapshot.body = snapshot.body.filter(item => {
      const itemId = String(item.id || "").toLowerCase();
      const itemDate = String(item.date || "").toLowerCase();
      return itemId !== key && itemDate !== key;
    });
    writeSnapshot(snapshot);
  },

  async getCoachStudents(): Promise<CoachStudent[]> {
    return readSnapshot().coachStudents;
  },

  async saveCoachStudent(link: CoachStudent): Promise<void> {
    const snapshot = readSnapshot();
    const normalized = normalizeCoachStudent(link);
    snapshot.coachStudents = [
      normalized,
      ...snapshot.coachStudents.filter(item => item.id !== normalized.id),
    ];
    writeSnapshot(snapshot);
  },
  async inviteStudentByEmail(link: CoachStudent): Promise<CoachStudent> {
    const normalized = normalizeCoachStudent({...link, status: "pending", studentId: ""});
    await this.saveCoachStudent(normalized);
    return normalized;
  },
  async refreshCoachInvite(link: CoachStudent): Promise<CoachStudent> {
    const snapshot = readSnapshot();
    const existing = snapshot.coachStudents.find(item => item.id === link.id);
    if(!existing || existing.status !== "pending") throw new Error("Somente convites pendentes podem ser reenviados.");
    const normalized = normalizeCoachStudent({...existing, ...link, status: "pending", updatedAt: nowIso()});
    snapshot.coachStudents = [normalized, ...snapshot.coachStudents.filter(item => item.id !== normalized.id)];
    writeSnapshot(snapshot);
    return normalized;
  },
  async acceptCoachInvite(link: CoachStudent): Promise<CoachStudent> {
    const normalized = normalizeCoachStudent({...link, status: "active", acceptedAt: new Date().toISOString()});
    await this.saveCoachStudent(normalized);
    return normalized;
  },
  async refuseCoachInvite(link: CoachStudent): Promise<CoachStudent> {
    const normalized = normalizeCoachStudent({...link, status: "refused", refusedAt: new Date().toISOString()});
    await this.saveCoachStudent(normalized);
    return normalized;
  },
  async deactivateCoachStudentLink(link: CoachStudent): Promise<CoachStudent> {
    const normalized = normalizeCoachStudent({...link, status: "inactive", inactiveAt: new Date().toISOString()});
    await this.saveCoachStudent(normalized);
    return normalized;
  },

  async deleteCoachStudent(id: string): Promise<void> {
    const snapshot = readSnapshot();
    snapshot.coachStudents = snapshot.coachStudents.filter(item => item.id !== id);
    writeSnapshot(snapshot);
  },

  async getSettings(): Promise<AppSettings | null> {
    const snapshot = readSnapshot();
    if(!snapshot.profile && !snapshot.timerSetpoint && !snapshot.appMode) return null;
    return {
      appMode: snapshot.appMode,
      currentUserId: snapshot.currentUserId || LOCAL_USER_ID,
      timerSetpoint: snapshot.timerSetpoint,
      autoStartRestTimer: snapshot.autoStartRestTimer,
      profile: snapshot.profile,
      editedBaseWorkouts: snapshot.editedBaseWorkouts,
      hiddenBaseWorkouts: snapshot.hiddenBaseWorkouts,
      hiddenCustomWorkouts: snapshot.hiddenCustomWorkouts,
      hiddenLibrary: snapshot.hiddenLibrary,
      coachStudents: snapshot.coachStudents,
      theme: snapshot.theme,
    };
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    const snapshot = readSnapshot();
    const next = normalizeSnapshot({...snapshot, currentUserId: settings.currentUserId || snapshot.currentUserId || LOCAL_USER_ID, ...settings});
    writeSnapshot(next);
  },

  async getAppData(): Promise<AppDataSnapshot> {
    return readSnapshot();
  },

  async saveAppData(data: Partial<AppDataSnapshot>): Promise<void> {
    writeSnapshot(normalizeSnapshot({...readSnapshot(), ...data}));
  },

  async saveValue<K extends keyof AppDataSnapshot>(key: K, value: AppDataSnapshot[K]): Promise<void> {
    // Transitional bridge for legacy/composite flows that do not have a domain method yet.
    const snapshot = readSnapshot();
    writeSnapshot({...snapshot, [key]: value});
  },

  async clearDraft(): Promise<void> {
    removeKey(KEYS.draft);
  },
} satisfies DataService;
