export interface EntityBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export type RepTarget =
  | {type: "fixed"; value: number; label: string}
  | {type: "range"; min: number; max: number; label: string}
  | {type: "text"; label: string};

export interface Athlete extends EntityBase {
  name: string;
  email?: string;
  role?: "athlete" | "coach" | string;
  age?: string;
  weight?: string;
  peso?: string;
  [key: string]: unknown;
}

export interface Exercise extends Partial<EntityBase> {
  name: string;
  sets?: string;
  reps?: string;
  load?: string;
  rest?: string;
  group?: string;
  muscleGroup?: string;
  category?: string;
  primaryGroup?: string;
  secondaryGroups?: string[];
  tags?: string[];
  equipment?: string;
  equipmentList?: string[];
  instructions?: string;
  technicalNotes?: string;
  type?: string;
  objective?: string;
  notes?: string;
  targetRepsBySet?: RepTarget[];
  targetLoadsBySet?: Array<string | number>;
  dropTargetsBySet?: Array<Array<{reps?: string; load?: string | number}>>;
  useRepTargetsBySet?: boolean;
  [key: string]: unknown;
}

export interface WorkoutExercise extends Exercise {}

export interface Workout extends Partial<EntityBase> {
  name: string;
  items: WorkoutExercise[];
  type?: "personal" | "student" | "template" | string;
  ownerId?: string;
  coachId?: string;
  coachName?: string;
  coachEmail?: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  sourceWorkoutId?: string;
  sourceTemplateId?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface CoachStudent extends Partial<EntityBase> {
  coachId: string;
  coachName?: string;
  coachEmail?: string;
  studentId?: string;
  studentName?: string;
  studentEmail: string;
  objective?: string;
  notes?: string;
  status: "pending" | "active" | "refused" | "inactive" | string;
  acceptedAt?: string;
  refusedAt?: string;
  inactiveAt?: string;
  [key: string]: unknown;
}

export interface WorkoutSet {
  id?: string;
  load?: string;
  reps?: string;
  done?: boolean;
  completed?: boolean;
  restSeconds?: string | number;
  studentNotes?: string;
  plannedReps?: string;
  plannedRepTarget?: RepTarget | null;
  drops?: Array<{
    dropIndex?: number;
    load?: string;
    reps?: string;
    done?: boolean;
    plannedLoad?: string;
    plannedReps?: string;
    plannedRepTarget?: RepTarget | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface BodyData {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  recordedBy?: string;
  recordedByName?: string;
  recordedByEmail?: string;
  date?: string;
  peso?: string;
  height?: string;
  age?: string;
  sex?: string;
  bf?: string;
  bodyFatMethod?: string;
  bodyFatMethodLabel?: string;
  bodyFatCalculated?: string;
  bodyFatManual?: string;
  bodyFatFinal?: string;
  bodyDensity?: string;
  skinfoldSum?: string;
  cintura?: string;
  neck?: string;
  shoulder?: string;
  hip?: string;
  chest?: string;
  abdomen?: string;
  arm?: string;
  armRight?: string;
  armLeft?: string;
  forearm?: string;
  forearmRight?: string;
  forearmLeft?: string;
  thigh?: string;
  thighRight?: string;
  thighLeft?: string;
  calf?: string;
  calfRight?: string;
  calfLeft?: string;
  notes?: string;
  skinfoldChest?: string;
  skinfoldAbdominal?: string;
  skinfoldThigh?: string;
  skinfoldTriceps?: string;
  skinfoldSubscapular?: string;
  skinfoldSuprailiac?: string;
  skinfoldMidaxillary?: string;
  skinfoldCalf?: string;
  skinfoldNotes?: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  coachId?: string;
  coachName?: string;
  coachEmail?: string;
  [key: string]: unknown;
}

export interface DraftData {
  userId?: string;
  [key: string]: unknown;
}

export interface WorkoutSessionExercise extends Partial<EntityBase> {
  exercise: string;
  workoutExerciseId?: string;
  workout_exercise_id?: string;
  done?: boolean;
  completedAt?: number | null;
  planned?: Record<string, unknown> & {targetRepsBySet?: RepTarget[]; targetLoadsBySet?: Array<string | number>; dropTargetsBySet?: Array<Array<{reps?: string; load?: string | number}>>};
  sets?: WorkoutSet[];
  load?: string;
  reps?: string;
  rpe?: string;
  note?: string;
  type?: string;
  group?: string;
  objective?: string;
  volume?: number;
  [key: string]: unknown;
}

export interface WorkoutSession extends EntityBase {
  date: string;
  workout: string;
  workoutKey?: string;
  workoutLabel?: string;
  workoutId?: string;
  workoutName?: string;
  workoutType?: string;
  coachId?: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  coachName?: string;
  coachEmail?: string;
  status?: string;
  volume?: number;
  totalVolume?: number;
  completionPct?: number;
  completion_percentage?: number;
  studentNotes?: string;
  startedAt?: number;
  endedAt?: number;
  durationSeconds?: number;
  duration?: string;
  items: WorkoutSessionExercise[];
  [key: string]: unknown;
}

export interface AppSettings extends Partial<EntityBase> {
  currentUserId?: string;
  appMode?: string;
  theme?: string;
  timerSetpoint?: number;
  autoStartRestTimer?: boolean;
  profile?: Partial<Athlete>;
  hiddenLibrary?: string[];
  hiddenBaseWorkouts?: string[];
  hiddenCustomWorkouts?: string[];
  editedBaseWorkouts?: Record<string, Workout>;
  [key: string]: unknown;
}

export interface AppDataSnapshot {
  sessions: WorkoutSession[];
  workoutSessions: WorkoutSession[];
  body: BodyData[];
  draft: DraftData;
  timerSetpoint: number;
  autoStartRestTimer: boolean;
  customWorkouts: Workout[];
  editedBaseWorkouts: Record<string, Workout>;
  hiddenBaseWorkouts: string[];
  hiddenCustomWorkouts: string[];
  profile: Partial<Athlete>;
  userLibrary: Exercise[];
  hiddenLibrary: string[];
  coachStudents: CoachStudent[];
  appMode: string;
  theme: string;
  currentUserId: string;
  authUser?: unknown;
}

export type DataMode = "local" | "cloud";

export interface DataService {
  getMode(): Promise<DataMode>;

  getAthletes(): Promise<Athlete[]>;
  saveAthlete(athlete: Athlete): Promise<void>;
  deleteAthlete(id: string): Promise<void>;

  getExercises(): Promise<Exercise[]>;
  saveExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;

  getWorkouts(): Promise<Workout[]>;
  saveWorkout(workout: Workout): Promise<void>;
  deleteWorkout(id: string): Promise<void>;

  getWorkoutHistory(): Promise<WorkoutSession[]>;
  saveWorkoutSession(session: WorkoutSession): Promise<void>;
  deleteWorkoutSession(id: string): Promise<void>;
  deleteBodyData(id: string): Promise<void>;

  getCoachStudents(): Promise<CoachStudent[]>;
  saveCoachStudent(link: CoachStudent): Promise<void>;
  inviteStudentByEmail(link: CoachStudent): Promise<CoachStudent>;
  refreshCoachInvite(link: CoachStudent): Promise<CoachStudent>;
  acceptCoachInvite(link: CoachStudent): Promise<CoachStudent>;
  refuseCoachInvite(link: CoachStudent): Promise<CoachStudent>;
  deactivateCoachStudentLink(link: CoachStudent): Promise<CoachStudent>;
  deleteCoachStudent(id: string): Promise<void>;

  getSettings(): Promise<AppSettings | null>;
  saveSettings(settings: AppSettings): Promise<void>;

  getAppData(): Promise<AppDataSnapshot>;
  saveAppData(data: Partial<AppDataSnapshot>): Promise<void>;
  saveValue<K extends keyof AppDataSnapshot>(key: K, value: AppDataSnapshot[K]): Promise<void>;
  clearDraft(): Promise<void>;
}
