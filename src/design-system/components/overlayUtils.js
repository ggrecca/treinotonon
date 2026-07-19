const FOCUSABLE_SELECTOR = ["button:not([disabled])", "input:not([disabled])", "select:not([disabled])", "textarea:not([disabled])", "a[href]", "[tabindex]:not([tabindex='-1'])"].join(",");
let scrollLockCount = 0;
let previousBodyOverflow = "";

export function focusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(element => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true" && element.tabIndex >= 0);
}

export function lockDocumentScroll() {
  if (scrollLockCount === 0) previousBodyOverflow = document.body.style.overflow;
  scrollLockCount += 1;
  document.body.style.overflow = "hidden";
}

export function unlockDocumentScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = previousBodyOverflow;
}

export function canDismissOverlay({pending = false, dismissible = true} = {}) {
  return !pending && dismissible !== false;
}
