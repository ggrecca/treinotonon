import { configurationError, isLocalModeEnabled, isSupabaseConfigured } from "../supabase/client";
import { cloudDataService } from "./cloudDataService";
import { localDataService } from "./localDataService";
import type { AppDataSnapshot, AppSettings, Athlete, CoachStudent, DataMode, DataService, Exercise, Workout, WorkoutSession } from "./types";

async function getActiveDataService(): Promise<DataService> {
  if(isSupabaseConfigured) return cloudDataService;
  if(isLocalModeEnabled) return localDataService;
  throw new Error(configurationError || "O aplicativo não está configurado para persistência de dados.");
}

async function execute<T>(operation: (service: DataService) => Promise<T>): Promise<T> {
  return operation(await getActiveDataService());
}

export const dataService = {
  async getMode(): Promise<DataMode> {
    return (await getActiveDataService()) === cloudDataService ? "cloud" : "local";
  },

  async getAthletes(): Promise<Athlete[]> { return execute(service => service.getAthletes()); },
  async saveAthlete(athlete: Athlete): Promise<void> { return execute(service => service.saveAthlete(athlete)); },
  async deleteAthlete(id: string): Promise<void> { return execute(service => service.deleteAthlete(id)); },

  async getExercises(): Promise<Exercise[]> { return execute(service => service.getExercises()); },
  async saveExercise(exercise: Exercise): Promise<void> { return execute(service => service.saveExercise(exercise)); },
  async deleteExercise(id: string): Promise<void> { return execute(service => service.deleteExercise(id)); },

  async getWorkouts(): Promise<Workout[]> { return execute(service => service.getWorkouts()); },
  async saveWorkout(workout: Workout): Promise<void> { return execute(service => service.saveWorkout(workout)); },
  async deleteWorkout(id: string): Promise<void> { return execute(service => service.deleteWorkout(id)); },

  async getWorkoutHistory(): Promise<WorkoutSession[]> { return execute(service => service.getWorkoutHistory()); },
  async saveWorkoutSession(session: WorkoutSession): Promise<void> { return execute(service => service.saveWorkoutSession(session)); },
  async deleteWorkoutSession(id: string): Promise<void> { return execute(service => service.deleteWorkoutSession(id)); },
  async deleteBodyData(id: string): Promise<void> { return execute(service => service.deleteBodyData(id)); },

  async getCoachStudents(): Promise<CoachStudent[]> { return execute(service => service.getCoachStudents()); },
  async saveCoachStudent(link: CoachStudent): Promise<void> { return execute(service => service.saveCoachStudent(link)); },
  async inviteStudentByEmail(link: CoachStudent): Promise<CoachStudent> { return execute(service => service.inviteStudentByEmail(link)); },
  async refreshCoachInvite(link: CoachStudent): Promise<CoachStudent> { return execute(service => service.refreshCoachInvite(link)); },
  async acceptCoachInvite(link: CoachStudent): Promise<CoachStudent> { return execute(service => service.acceptCoachInvite(link)); },
  async refuseCoachInvite(link: CoachStudent): Promise<CoachStudent> { return execute(service => service.refuseCoachInvite(link)); },
  async deactivateCoachStudentLink(link: CoachStudent): Promise<CoachStudent> { return execute(service => service.deactivateCoachStudentLink(link)); },
  async deleteCoachStudent(id: string): Promise<void> { return execute(service => service.deleteCoachStudent(id)); },

  async getSettings(): Promise<AppSettings | null> { return execute(service => service.getSettings()); },
  async saveSettings(settings: AppSettings): Promise<void> { return execute(service => service.saveSettings(settings)); },

  async getAppData(): Promise<AppDataSnapshot> { return execute(service => service.getAppData()); },
  async saveAppData(data: Partial<AppDataSnapshot>): Promise<void> { return execute(service => service.saveAppData(data)); },
  async saveValue<K extends keyof AppDataSnapshot>(key: K, value: AppDataSnapshot[K]): Promise<void> {
    return execute(service => service.saveValue(key, value));
  },
  async clearDraft(): Promise<void> { return execute(service => service.clearDraft()); },
} satisfies DataService;

export { cloudDataService, localDataService };
export { getActiveDataService };

export type {
  AppDataSnapshot,
  AppSettings,
  Athlete,
  BodyData,
  CoachStudent,
  DataMode,
  DataService,
  DraftData,
  Exercise,
  Workout,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
} from "./types";
