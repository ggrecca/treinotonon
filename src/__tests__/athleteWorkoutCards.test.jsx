import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = name => readFileSync(resolve(process.cwd(), name), "utf8");

describe("cards de treino do atleta", () => {
  it("mantém conteúdo e ação em áreas responsivas separadas", () => {
    const app = projectFile("src/App.jsx");
    const css = projectFile("src/style.css");

    expect(app).toContain('className="managerActions athleteWorkoutCardAction"');
    expect(css).toContain(".athleteWorkoutsScreen .workoutListCard{\n  display:grid;\n  grid-template-columns:minmax(0,1fr) auto;");
    expect(css).toContain(".athleteWorkoutsScreen .workoutCardOpen{\n  width:100%;\n  min-height:0;\n  padding:0;\n  border:0;");
    expect(css).toContain(".athleteWorkoutsScreen .workoutCardOpen:focus-visible{");
    expect(css).toContain(".athleteWorkoutsScreen .workoutCardTitle{\n  display:flex;\n  align-items:flex-start;\n  flex-wrap:wrap;");
    expect(css).toContain(".athleteWorkoutsScreen .workoutCardTitle strong{\n  flex:1 1 150px;\n  min-width:0;");
    expect(css).toContain(".athleteWorkoutsScreen .athleteWorkoutCardAction{\n    width:100%;\n    justify-self:stretch;");
  });
});
