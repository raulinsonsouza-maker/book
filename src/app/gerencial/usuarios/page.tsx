"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  disabledAt: string | null;
  createdAt: string;
  memberships: {
    role: string;
    organization: { name: string; slug: string };
  }[];
};

export default function GerencialUsuariosPage() {
  const [rows, setRows] = useState<UserRow[]>([]);

  async function load() {
    const res = await fetch("/api/gerencial/users");
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleDisabled(u: UserRow) {
    await fetch(`/api/gerencial/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: !u.disabledAt }),
    });
    await load();
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted-bg/50 text-xs uppercase text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Usuário</th>
            <th className="px-4 py-3 font-semibold">Empresa</th>
            <th className="px-4 py-3 font-semibold">Papel</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const m = u.memberships[0];
            return (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-muted">
                  {m ? m.organization.name : u.isPlatformAdmin ? "Plataforma" : "—"}
                </td>
                <td className="px-4 py-3">
                  {u.isPlatformAdmin ? "Admin Symbius" : m?.role ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {u.disabledAt ? (
                    <span className="tag-inactive tag">Desativado</span>
                  ) : (
                    <span className="tag-active tag">Ativo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!u.isPlatformAdmin && (
                    <button
                      type="button"
                      className="text-xs font-medium text-danger"
                      onClick={() => void toggleDisabled(u)}
                    >
                      {u.disabledAt ? "Reativar" : "Desativar"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
