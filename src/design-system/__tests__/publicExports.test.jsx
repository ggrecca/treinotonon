import {describe, expect, it, vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import React from "react";
import {
  Badge, BottomSheet, Button, Card, Chip, Dialog, EmptyState, Input, Loading,
  Skeleton, Tabs, Toast, ToastRegion, designTokens, spacing, typography,
} from "../index";

describe("design system public API", () => {
  it("exposes the documented tokens and base components", () => {
    expect(spacing[16]).toBe(16);
    expect(typography.h1.weight).toBe(800);
    expect(designTokens.color.primary).toBe("--tt-color-primary");
    [Button, Input, Card, Badge, Chip, Dialog, BottomSheet, Toast, ToastRegion, Tabs, Loading, Skeleton, EmptyState]
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
});
