"use client";

import { useState, type ReactNode } from "react";

interface HomeProductTab {
  key: string;
  label: string;
  content: ReactNode;
}

interface HomeProductTabsProps {
  tabs: HomeProductTab[];
}

// Panels are rendered on the server and only toggled here, so product cards
// stay server components and switching tabs costs no fetch.
export function HomeProductTabs({ tabs }: Readonly<HomeProductTabsProps>) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);

  return (
    <>
      <div role="tablist" aria-label="หมวดสินค้า" className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`home-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`home-panel-${tab.key}`}
              onClick={() => setActiveKey(tab.key)}
              className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors duration-300 ease-out ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`home-panel-${tab.key}`}
          aria-labelledby={`home-tab-${tab.key}`}
          hidden={tab.key !== activeKey}
          className="mt-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
        >
          {tab.content}
        </div>
      ))}
    </>
  );
}
