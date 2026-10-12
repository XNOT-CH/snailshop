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
      {/* Plain text tabs with a short bar under the active one, so they don't
          read as more of the game chips (pills that link away) right above. */}
      <div role="tablist" aria-label="หมวดสินค้า" className="flex flex-wrap gap-6">
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
              className={`relative pb-2 text-base font-semibold transition-colors duration-300 ease-out ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary transition-[scale] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive ? "scale-x-100" : "scale-x-0"
                }`}
              />
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
