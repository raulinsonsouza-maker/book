"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { NavIconSettings } from "@/components/admin/NavIcons";

function initials(name?: string | null) {
  if (!name) return "B";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

type Props = {
  accountName: string;
  workspaceName: string;
  roleLabel: string;
  settingsHref: string;
  settingsActive: boolean;
  collapsed: boolean;
  onNavigate: () => void;
};

export function SidebarAccountMenu({
  accountName,
  workspaceName,
  roleLabel,
  settingsHref,
  settingsActive,
  collapsed,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`sidebar-account ${collapsed ? "is-collapsed" : ""} ${
        open ? "is-open" : ""
      }`}
      ref={rootRef}
    >
      {open && (
        <div
          id={menuId}
          className="sidebar-account-menu"
          role="menu"
          aria-label="Conta"
        >
          <div className="sidebar-account-menu-head">
            <span className="sidebar-user-avatar" aria-hidden>
              {initials(accountName)}
            </span>
            <div className="min-w-0">
              <p className="sidebar-account-menu-name">{accountName}</p>
              <p className="sidebar-account-menu-meta">
                {workspaceName}
                {roleLabel ? ` · ${roleLabel}` : ""}
              </p>
            </div>
          </div>

          <div className="sidebar-account-menu-section">
            <Link
              href={settingsHref}
              role="menuitem"
              className={`sidebar-account-menu-item ${
                settingsActive ? "is-active" : ""
              }`}
              onClick={() => {
                setOpen(false);
                onNavigate();
              }}
            >
              <NavIconSettings />
              <span>Configurações</span>
            </Link>
          </div>

          <div className="sidebar-account-menu-section">
            <button
              type="button"
              role="menuitem"
              className="sidebar-account-menu-item is-danger"
              onClick={() => {
                setOpen(false);
                void signOut({ callbackUrl: "/" });
              }}
            >
              Sair
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="sidebar-account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={accountName}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sidebar-user-avatar" aria-hidden>
          {initials(accountName)}
        </span>
        {!collapsed && (
          <>
            <span className="sidebar-account-trigger-text min-w-0 flex-1 text-left">
              <span className="sidebar-account-trigger-name truncate">
                {workspaceName || accountName}
              </span>
              <span className="sidebar-account-trigger-meta truncate">
                {accountName}
                {roleLabel ? ` · ${roleLabel}` : ""}
              </span>
            </span>
            <span className="sidebar-account-caret" aria-hidden>
              {open ? "▴" : "▾"}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
