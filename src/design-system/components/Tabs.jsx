import React, {useId, useRef} from "react";

export function getNextEnabledTabIndex(tabs, currentIndex, key) {
  if (!tabs.length) return currentIndex;
  if (key === "Home") {
    const firstEnabled = tabs.findIndex(tab => !tab.disabled);
    return firstEnabled === -1 ? currentIndex : firstEnabled;
  }
  if (key === "End") {
    const lastEnabled = tabs.reduce((result, tab, index) => tab.disabled ? result : index, -1);
    return lastEnabled === -1 ? currentIndex : lastEnabled;
  }
  const direction = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
  if (!direction) return currentIndex;
  for (let step = 1; step <= tabs.length; step += 1) {
    const index = (currentIndex + (direction * step) + tabs.length) % tabs.length;
    if (!tabs[index].disabled) return index;
  }
  return currentIndex;
}

export function Tabs({tabs = [], value, onChange, ariaLabel = "Abas", id, panelId, className = ""}) {
  const generatedId = useId().replace(/:/g, "");
  const tabsId = id || `tt-tabs-${generatedId}`;
  const tabRefs = useRef(new Map());
  const selectTab = index => {
    const tab = tabs[index];
    if (!tab || tab.disabled) return;
    onChange?.(tab.value);
  };
  const handleKeyDown = (event, index) => {
    const nextIndex = getNextEnabledTabIndex(tabs, index, event.key);
    if (nextIndex === index || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    selectTab(nextIndex);
    tabRefs.current.get(tabs[nextIndex].value)?.focus();
  };

  return <div className={`tt-tabs ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
    {tabs.map((tab, index) => {
      const active = tab.value === value;
      const tabId = `${tabsId}-tab-${tab.value}`;
      return <button
        key={tab.value}
        ref={element => { if (element) tabRefs.current.set(tab.value, element); }}
        id={tabId}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls={panelId ? `${panelId}-${tab.value}` : undefined}
        tabIndex={active ? 0 : -1}
        className={`tt-tabs__tab ${active ? "tt-tabs__tab--active" : ""}`}
        onClick={()=>selectTab(index)}
        onKeyDown={event=>handleKeyDown(event, index)}
        disabled={tab.disabled}
      >
        {tab.icon && <span className="tt-tabs__icon" aria-hidden="true">{tab.icon}</span>}
        <span className="tt-tabs__label">{tab.label}</span>
        {tab.count !== undefined && <span className="tt-tabs__count">{tab.count}</span>}
      </button>;
    })}
  </div>;
}

export function TabsContent({as: Component = "div", id, labelledBy, children, className = "", ...props}) {
  return <Component {...props} id={id} role="tabpanel" aria-labelledby={labelledBy} className={`tt-tabs__content ${className}`.trim()}>{children}</Component>;
}
