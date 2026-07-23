const EXERCISE_NAME_FIELDS = ["name", "exerciseName", "exercise_name", "title"] as const;

type ExerciseNameSource = string | Record<string, unknown> | null | undefined;

export function resolveExerciseName(value: ExerciseNameSource): string {
  if(typeof value === "string") return value.trim();
  if(!value || typeof value !== "object") return "";
  for(const field of EXERCISE_NAME_FIELDS){
    const candidate = String(value[field] || "").trim();
    if(candidate) return candidate;
  }
  return "";
}

export function normalizeExerciseName(value: ExerciseNameSource): string {
  return resolveExerciseName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\b(com|no|na|de|da|do|em)\b/g,"")
    .replace(/\s+/g," ")
    .trim();
}

export function findExactExerciseMatches<T extends Record<string, unknown>>(exercises: T[] | null | undefined, name: ExerciseNameSource): T[] {
  const normalizedName = normalizeExerciseName(name);
  if(!normalizedName) return [];
  return (Array.isArray(exercises) ? exercises : []).filter(exercise =>
    normalizeExerciseName(exercise) === normalizedName,
  );
}
