import type { ReactNode } from "react";

type Section = {
  title: string;
  content: ReactNode;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro: ReactNode;
  sections: Section[];
};

export function LegalDocument({
  eyebrow,
  title,
  updatedAt,
  intro,
  sections,
}: LegalDocumentProps) {
  return (
    <article className="surface p-8 md:p-10">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">Última atualização: {updatedAt}</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">{intro}</div>
      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
