import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = name => readFileSync(resolve(process.cwd(), name), "utf8");

describe("estabilização final 2.0.0", () => {
  it("centraliza a versão pública e a exibe no rodapé", () => {
    const release = projectFile("src/config/release.js");
    const app = projectFile("src/App.jsx");
    const manifest = projectFile("package.json");

    expect(release).toContain('APP_VERSION = "2.0.0"');
    expect(manifest).toContain('"version": "2.0.0"');
    expect(app).toContain('import { APP_VERSION } from "./config/release"');
    expect(app).toContain("Treino Tonon — versão {APP_VERSION}");
    expect(app).toContain("em parceria com Vitor Tonon");
  });

  it("versiona os caches e evita cache HTTP ao procurar um novo service worker", () => {
    const worker = projectFile("public/sw.js");
    const registration = projectFile("src/pwa/registerPwa.js");

    expect(worker).toContain('CACHE_REVISION = "2.0.0-20260719"');
    expect(worker).toContain("caches.delete(name)");
    expect(registration).toContain('updateViaCache:"none"');
  });

  it("mantém camadas críticas acima do menu e cards sem interação aninhada", () => {
    const app = projectFile("src/App.jsx");
    const css = projectFile("src/style.css");

    expect(css).toContain(".fixedActionMenuPanel{");
    expect(css).toContain("z-index:var(--tt-z-dropdown);");
    expect(css).not.toContain(".fixedActionMenuPanel{\n  position:fixed;\n  z-index:9999;");
    expect(app).toContain('className="studentCardOpen"');
    expect(app).toContain('className="workoutCardContent workoutCardOpen"');
    expect(app).toContain('className="libraryCardOpen"');
    expect(app).not.toContain('className="libraryCard rich tappable" onClick');
  });

  it("usa tokens do Design System no tooltip corporal", () => {
    const app = projectFile("src/App.jsx");

    expect(app).toContain('background:"var(--tt-color-surface)"');
    expect(app).toContain('boxShadow:"var(--tt-shadow-md)"');
  });
});
