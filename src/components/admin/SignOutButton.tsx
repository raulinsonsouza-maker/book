"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="btn-secondary !px-3 !py-1.5 !text-xs"
    >
      Sair
    </button>
  );
}
