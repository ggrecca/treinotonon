import {describe, expect, it} from "vitest";
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
});
