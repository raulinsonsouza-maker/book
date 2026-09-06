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

export default function AdminUsuariosPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    setMsg("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(d.error || "Erro");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-3">
      {msg && <p className="text-sm text-danger">{msg}</p>}
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted-bg/50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Usuário</th>
              <th className="px-4 py-3 font-semibold">Empresas</th>
              <th className="px-4 py-3 font-semibold">Papel</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-muted">
                  {u.memberships.length === 0
                    ? u.isPlatformAdmin
                      ? "Plataforma"
                      : "—"
                    : u.memberships
                        .map((m) => m.organization.name)
                        .join(", ")}
                </td>
                <td className="px-4 py-3">
                  {u.isPlatformAdmin ? "Admin Symbius" : u.memberships[0]?.role ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {u.disabledAt ? (
                    <span className="tag-inactive tag">Desativado</span>
                  ) : (
                    <span className="tag-active tag">Ativo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs font-medium underline"
                    onClick={() =>
                      void patch(u.id, {
                        isPlatformAdmin: !u.isPlatformAdmin,
                      })
                    }
                  >
                    {u.isPlatformAdmin ? "Revogar admin" : "Promover admin"}
                  </button>
                  {!u.isPlatformAdmin && (
                    <button
                      type="button"
                      className="text-xs font-medium text-danger"
                      onClick={() =>
                        void patch(u.id, { disabled: !u.disabledAt })
                      }
                    >
                      {u.disabledAt ? "Reativar" : "Desativar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
