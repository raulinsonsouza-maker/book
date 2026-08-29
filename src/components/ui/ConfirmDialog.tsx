"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** destructive = red confirm button */
  tone?: "default" | "danger";
};

type AlertOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
};

type DialogState =
  | ({
      mode: "confirm";
      resolve: (value: boolean) => void;
    } & ConfirmOptions)
  | ({
      mode: "alert";
      resolve: () => void;
    } & AlertOptions)
  | null;

type ConfirmApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider");
  }
  return ctx;
}

function ConfirmModal({
  state,
  onClose,
}: {
  state: NonNullable<DialogState>;
  onClose: (ok: boolean) => void;
}) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const isDanger = state.mode === "confirm" && state.tone === "danger";
  const confirmLabel =
    state.mode === "confirm"
      ? state.confirmLabel || (isDanger ? "Excluir" : "Confirmar")
      : state.confirmLabel || "Entendi";
  const cancelLabel =
    state.mode === "confirm" ? state.cancelLabel || "Cancelar" : null;

  useEffect(() => {
    confirmRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition"
        onClick={() => onClose(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={state.description ? descId : undefined}
        className="relative z-10 w-full max-w-md animate-in overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-black/15"
      >
        <div className="px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <div className="flex gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isDanger
                  ? "bg-red-50 text-danger"
                  : "bg-muted-bg text-foreground"
              }`}
              aria-hidden
            >
              {isDanger ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 8v5m0 3h.01"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-base font-semibold tracking-tight text-foreground"
              >
                {state.title}
              </h2>
              {state.description && (
                <p
                  id={descId}
                  className="mt-1.5 text-sm leading-relaxed text-muted"
                >
                  {state.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {cancelLabel && (
            <button
              type="button"
              onClick={() => onClose(false)}
              className="btn-secondary w-full sm:w-auto"
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={
              isDanger
                ? "inline-flex w-full items-center justify-center rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 sm:w-auto"
                : "btn-primary w-full sm:w-auto"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ mode: "confirm", ...options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setState({ mode: "alert", ...options, resolve });
    });
  }, []);

  function handleClose(ok: boolean) {
    if (!state) return;
    const current = state;
    setState(null);
    if (current.mode === "confirm") current.resolve(ok);
    else current.resolve();
  }

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {state && <ConfirmModal state={state} onClose={handleClose} />}
    </ConfirmContext.Provider>
  );
}
