export type VisitRecordFields = {
  complaint: string;
  treated: string;
  guidance: string;
  extras: string;
};

export type VisitRecordPayload = VisitRecordFields & { v: 1 };

export function emptyVisitRecord(): VisitRecordFields {
  return { complaint: "", treated: "", guidance: "", extras: "" };
}

export function encodeVisitRecord(fields: VisitRecordFields): string {
  const payload: VisitRecordPayload = {
    v: 1,
    complaint: fields.complaint.trim(),
    treated: fields.treated.trim(),
    guidance: fields.guidance.trim(),
    extras: fields.extras.trim(),
  };
  return JSON.stringify(payload);
}

export function decodeVisitRecord(raw: string): VisitRecordFields {
  const empty = emptyVisitRecord();
  if (!raw?.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<VisitRecordPayload> & {
      body?: string;
    };
    if (parsed && typeof parsed === "object" && parsed.v === 1) {
      return {
        complaint: String(parsed.complaint || ""),
        treated: String(parsed.treated || ""),
        guidance: String(parsed.guidance || ""),
        extras: String(parsed.extras || ""),
      };
    }
  } catch {
    // plain text note
  }
  return { ...empty, treated: raw };
}

export function visitRecordSummary(raw: string): string {
  const fields = decodeVisitRecord(raw);
  const parts = [
    fields.complaint,
    fields.treated,
    fields.guidance,
    fields.extras,
  ].filter(Boolean);
  if (!parts.length) return "Registro do atendimento";
  return parts.join(" · ").slice(0, 160);
}

export function visitRecordIsEmpty(fields: VisitRecordFields): boolean {
  return !(
    fields.complaint.trim() ||
    fields.treated.trim() ||
    fields.guidance.trim() ||
    fields.extras.trim()
  );
}
