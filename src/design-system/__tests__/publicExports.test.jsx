import {describe, expect, it, vi} from "vitest";
import {readFileSync} from "node:fs";
import {renderToStaticMarkup} from "react-dom/server";
import React from "react";
import {getNextEnabledTabIndex} from "../components/Tabs";
import {
  Badge, BottomSheet, Button, Card, Chip, Dialog, EmptyState, Input, Loading, Select, Textarea,
  Skeleton, Tabs, TabsContent, Toast, ToastRegion, designTokens, spacing, typography,
} from "../index";

describe("design system public API", () => {
  it("exposes the documented tokens and base components", () => {
    expect(spacing[16]).toBe(16);
    expect(typography.h1.weight).toBe(800);
    expect(designTokens.color.primary).toBe("--tt-color-primary");
    [Button, Input, Textarea, Select, Card, Badge, Chip, Dialog, BottomSheet, Toast, ToastRegion, Tabs, TabsContent, Loading, Skeleton, EmptyState]
      .forEach(component => expect(component).toBeTruthy());
  });

  it("supports button variants and non-critical interaction states", () => {
    const primary = renderToStaticMarkup(<Button>Salvar</Button>);
    const ghost = renderToStaticMarkup(<Button variant="ghost" size="sm">Voltar</Button>);
    const danger = renderToStaticMarkup(<Button variant="danger" disabled>Excluir</Button>);
    const loading = renderToStaticMarkup(<Button loading>Carregando</Button>);
    const iconOnly = renderToStaticMarkup(<Button variant="ghost" iconOnly aria-label="Anterior">←</Button>);

    expect(primary).toContain("tt-button--primary");
    expect(ghost).toContain("tt-button--ghost");
    expect(danger).toContain("disabled");
    expect(loading).toContain('aria-busy="true"');
    expect(iconOnly).toContain("tt-button--icon-only");
  });

  it("renders an informational badge with the documented visual variant", () => {
    expect(renderToStaticMarkup(<Badge variant="info">Ativo</Badge>)).toContain("tt-badge--info");
  });

  it("forwards one caller-owned click handler without changing its event contract", () => {
    const onClick = vi.fn();
    const element = Button({children: "Abrir", onClick});

    expect(element.props.onClick).toBe(onClick);
    element.props.onClick();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports an accessible native button card without duplicating its click handler", () => {
    const onClick = vi.fn();
    const element = Card({as: "button", interactive: true, onClick, children: "Abrir resumo"});

    expect(element.type).toBe("button");
    expect(element.props.type).toBe("button");
    expect(element.props.className).toContain("tt-card--interactive");
    expect(element.props.onClick).toBe(onClick);
    element.props.onClick();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders native field semantics, metadata and validation without invoking onChange", () => {
    const onChange = vi.fn();
    const markup = renderToStaticMarkup(<Input id="load" label="Carga" helperText="Use kg" error="Obrigatório" required disabled readOnly inputMode="decimal" value="12,5" onChange={onChange} />);

    expect(markup).toContain('for="load"');
    expect(markup).toContain('id="load"');
    expect(markup).toContain('aria-describedby="load-hint load-error"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('required=""');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('readonly=""');
    expect(markup).toContain('inputMode="decimal"');
    expect(markup).toContain('value="12,5"');
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps textarea and select as native controls with forwarded attributes and refs", () => {
    const textarea = renderToStaticMarkup(<Textarea id="notes" name="notes" rows={4} defaultValue="Observação" />);
    const select = renderToStaticMarkup(<Select id="objective" name="objective" value="força" onChange={()=>{}}><option value="força">Força</option></Select>);
    const decorated = renderToStaticMarkup(<Input id="weight" prefix="kg" endAdornment={<span>×</span>} />);

    expect(textarea).toContain('<textarea');
    expect(textarea).toContain('name="notes"');
    expect(textarea).toContain('rows="4"');
    expect(textarea).toContain('>Observação</textarea>');
    expect(select).toContain('<select');
    expect(select).toContain('name="objective"');
    expect(select).toContain('value="força"');
    expect(decorated).toContain('tt-input__frame');
    expect(decorated).toContain('tt-input__adornment');
    [Input, Textarea, Select].forEach(control => expect(control.render).toBeTypeOf("function"));
  });

  it("reserves the Button focus indicator for keyboard-visible focus", () => {
    const css = readFileSync(new URL("../styles/design-system.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.tt-button\s*\{[^}]*border:\s*1px solid transparent;[^}]*box-shadow:\s*none;[^}]*outline:\s*0;/);
    expect(css).toMatch(/\.tt-button:focus-visible\s*\{\s*box-shadow:\s*none;\s*outline:\s*2px solid var\(--tt-color-primary\);\s*outline-offset:\s*2px;/);
    expect(css.indexOf(".tt-button:focus-visible")).toBeGreaterThan(css.indexOf(".tt-ui :focus-visible"));
  });

  it("connects tabs to their panel with accessible roles and state", () => {
    const markup = renderToStaticMarkup(<><Tabs id="students" panelId="student-panel" value="active" onChange={()=>{}} tabs={[{value: "all", label: "Todos", count: 3}, {value: "active", label: "Ativos"}, {value: "disabled", label: "Indisponível", disabled: true}]} /><TabsContent id="student-panel-active" labelledBy="students-tab-active">Conteúdo ativo</TabsContent></>);

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('id="students-tab-active"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('aria-controls="student-panel-active"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('aria-labelledby="students-tab-active"');
    expect(markup).toContain('disabled=""');
  });

  it("moves keyboard navigation across enabled tabs without selecting a disabled tab", () => {
    const tabs = [{value: "all"}, {value: "inactive", disabled: true}, {value: "attention"}];

    expect(getNextEnabledTabIndex(tabs, 0, "ArrowRight")).toBe(2);
    expect(getNextEnabledTabIndex(tabs, 2, "ArrowRight")).toBe(0);
    expect(getNextEnabledTabIndex(tabs, 2, "Home")).toBe(0);
    expect(getNextEnabledTabIndex(tabs, 0, "End")).toBe(2);
  });

  it("protects Tabs hover and keyboard focus from the legacy global button selector", () => {
    const css = readFileSync(new URL("../styles/design-system.css", import.meta.url), "utf8");

    expect(css).toContain(".tt-tabs__tab:hover:not(:disabled) { background: transparent; border-color: transparent;");
    expect(css).toContain(".tt-tabs__tab:focus-visible { border-color: transparent; box-shadow: none; outline: 2px solid var(--tt-color-primary);");
  });
});
