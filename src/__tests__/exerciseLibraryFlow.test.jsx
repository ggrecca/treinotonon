import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const appPath = path.resolve(process.cwd(), "src/App.jsx");
const cssPath = path.resolve(process.cwd(), "src/style.css");

describe("exercise library and inline creation flow", () => {
  it("renders the exercise name through the normalized resolver and preserves it visually", () => {
    const app = fs.readFileSync(appPath, "utf8");
    const css = fs.readFileSync(cssPath, "utf8");
    expect(app).toContain('name:resolveExerciseName(ex)');
    expect(app).toContain('<b>{ex.name}</b>');
    expect(css).toContain('.libraryCard.rich b{');
    expect(css).toContain('-webkit-line-clamp:2');
    expect(css).toContain('align-items:start');
  });

  it("offers inline creation, detects exact duplicates and adds only after persistence", () => {
    const app = fs.readFileSync(appPath, "utf8");
    expect(app).toContain('Nenhum exercício encontrado');
    expect(app).toContain('Criar “${workoutLibrarySearch.trim()}”');
    expect(app).toContain('await dataService.saveExercise(normalized)');
    expect(app).toContain('addExerciseToWorkoutDraft(normalized)');
    expect(app.indexOf('await dataService.saveExercise(normalized)')).toBeLessThan(app.indexOf('addExerciseToWorkoutDraft(normalized)'));
    expect(app).toContain('findExactExerciseMatches(fullLibrary, normalized.name)');
    expect(app).toContain('Este exercício já está no treino.');
  });
});
