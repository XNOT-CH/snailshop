import type { ReactNode } from "react";

type RouteShellProps = {
  children: ReactNode;
  navbar: ReactNode;
  mobileBottomNav: ReactNode;
  footer: ReactNode;
  floatingChat: ReactNode;
  announcementPopup: ReactNode;
};

export function RouteShell({
  children,
  navbar,
  mobileBottomNav,
  footer,
  floatingChat,
  announcementPopup,
}: RouteShellProps) {
  return (
    <>
      {navbar}
      <div
        id="main-container"
        className="min-h-[calc(100dvh-4rem)] flex-1 w-full max-w-7xl mx-auto px-3 pb-[calc(var(--mobile-bottom-nav-height)+0.75rem)] sm:px-4 md:pb-0 lg:px-6 xl:px-8"
      >
        <main className="animate-page-enter min-w-0">{children}</main>
      </div>
      {mobileBottomNav}
      <div id="main-footer">{footer}</div>
      <div id="main-chat">{floatingChat}</div>
      <div id="main-popup">{announcementPopup}</div>
    </>
  );
}
