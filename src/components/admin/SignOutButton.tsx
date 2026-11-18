"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className || "btn-secondary !px-3 !py-1.5 !text-xs"}
    >
      Sair
    </button>
  );
}
