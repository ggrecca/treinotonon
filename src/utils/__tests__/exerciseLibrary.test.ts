import { describe, expect, it } from "vitest";
import { findExactExerciseMatches, normalizeExerciseName, resolveExerciseName } from "../exerciseLibrary";

describe("exercise library identity", () => {
  it("uses supported legacy name fields before treating an exercise as unnamed", () => {
    expect(resolveExerciseName({ exercise_name: "Elevação lateral no cabo" })).toBe("Elevação lateral no cabo");
    expect(resolveExerciseName({ exerciseName: "Rosca direta" })).toBe("Rosca direta");
    expect(resolveExerciseName({ title: "Remada curvada" })).toBe("Remada curvada");
    expect(resolveExerciseName({ name: "Supino reto", title: "Outro" })).toBe("Supino reto");
  });

  it("normalizes case, accents and surrounding whitespace for exact duplicate detection", () => {
    expect(normalizeExerciseName(" Rosca Direta ")).toBe(normalizeExerciseName("rosca direta"));
    expect(findExactExerciseMatches([
      { id: "1", name: "Rosca Direta" },
      { id: "2", name: "Rosca Martelo" },
    ], " rosca direta ")).toEqual([{ id: "1", name: "Rosca Direta" }]);
  });

  it("does not treat distinct names as duplicates", () => {
    expect(findExactExerciseMatches([
      { id: "1", name: "Elevação lateral" },
    ], "Elevação lateral no cabo")).toEqual([]);
  });
});
