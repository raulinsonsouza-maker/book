import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type NichePoint = { title: string; body: string };
export type NicheStep = { title: string; body: string };

export type NicheLandingContent = {
  theme: string;
  logoLight?: boolean;
  hero: { src: string; alt: string; objectPosition?: string };
  photo: { src: string; alt: string };
  headline: ReactNode;
  lead: string;
  ctaPrimary: string;
  ctaGhost?: string;
  pain: { kicker: string; title: ReactNode; body: string };
  money: { kicker: string; title: ReactNode; body: string; points: NichePoint[] };
  flow: { kicker: string; title: ReactNode; steps: NicheStep[] };
  proof: { kicker: string; title: ReactNode; body: string; cta: string };
  close: { title: ReactNode; body: string; cta: string };
};

export function NicheLanding({ content }: { content: NicheLandingContent }) {
  const {
    theme,
    logoLight = false,
    hero,
    photo,
    headline,
    lead,
    ctaPrimary,
    ctaGhost = "Ver como funciona",
    pain,
    money,
    flow,
    proof,
    close,
  } = content;

  return (
    <div className={`niche-lp niche-lp--${theme} min-h-screen`}>
      <header className="niche-lp-nav">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src={logoLight ? "/logo-white.png" : "/logo.png"}
              alt="Book Symbius"
              width={28}
              height={28}
              priority
            />
            <span className="niche-lp-nav-brand font-brand text-[15px] tracking-tight">
              Book Symbius
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="niche-lp-nav-link">
              Entrar
            </Link>
            <Link href="/signup" className="niche-lp-cta niche-lp-cta--sm">
              Começar agora
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="niche-lp-hero">
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            priority
            quality={90}
            className={`object-cover ${hero.objectPosition || "object-center"}`}
            sizes="100vw"
          />
          <div className="niche-lp-hero-scrim" aria-hidden />
          <div className="niche-lp-hero-inner">
            <h1 className="niche-lp-headline niche-lp-rise">{headline}</h1>
            <p className="niche-lp-lead niche-lp-rise niche-lp-rise-1">{lead}</p>
            <div className="niche-lp-rise niche-lp-rise-2 mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="niche-lp-cta">
                {ctaPrimary}
              </Link>
              <a href="#dia-a-dia" className="niche-lp-ghost">
                {ctaGhost}
              </a>
            </div>
          </div>
        </section>

        <section className="niche-lp-section">
          <div className="mx-auto max-w-3xl px-5 text-center md:px-6">
            <p className="niche-lp-kicker">{pain.kicker}</p>
            <h2 className="niche-lp-h2 mt-3">{pain.title}</h2>
            <p className="niche-lp-body mx-auto mt-5 max-w-2xl">{pain.body}</p>
          </div>
        </section>

        <section className="niche-lp-band">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2 md:items-center md:gap-14 md:px-6">
            <div className="niche-lp-photo">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="niche-lp-kicker">{money.kicker}</p>
              <h2 className="niche-lp-h2 mt-3">{money.title}</h2>
              <p className="niche-lp-body mt-5">{money.body}</p>
              <ul className="niche-lp-points mt-8">
                {money.points.map((p) => (
                  <li key={p.title}>
                    <strong>{p.title}</strong>
                    <span>{p.body}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="dia-a-dia" className="niche-lp-section">
          <div className="mx-auto max-w-6xl px-5 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="niche-lp-kicker">{flow.kicker}</p>
              <h2 className="niche-lp-h2 mt-3">{flow.title}</h2>
            </div>
            <div className="niche-lp-flow mt-14">
              {flow.steps.map((step, i) => (
                <article key={step.title}>
                  <span className="niche-lp-step">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="niche-lp-proof">
          <div className="mx-auto max-w-6xl px-5 md:px-6">
            <div className="niche-lp-proof-panel">
              <p className="niche-lp-kicker niche-lp-kicker--on-panel">
                {proof.kicker}
              </p>
              <h2 className="niche-lp-h2 niche-lp-h2--on-panel mt-3">
                {proof.title}
              </h2>
              <p className="niche-lp-body niche-lp-body--on-panel mt-5 max-w-xl">
                {proof.body}
              </p>
              <Link href="/signup" className="niche-lp-cta mt-8 inline-flex">
                {proof.cta}
              </Link>
            </div>
          </div>
        </section>

        <section className="niche-lp-section !pb-24">
          <div className="mx-auto max-w-2xl px-5 text-center md:px-6">
            <h2 className="niche-lp-h2">{close.title}</h2>
            <p className="niche-lp-body mx-auto mt-5">{close.body}</p>
            <Link href="/signup" className="niche-lp-cta mt-8 inline-flex">
              {close.cta}
            </Link>
            <p className="niche-lp-footnote mt-6 text-sm">
              Já tem conta?{" "}
              <Link href="/login" className="niche-lp-inline-link">
                Entrar
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="niche-lp-footer">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-sm md:px-6">
          <Link href="/" className="font-brand niche-lp-footer-brand">
            Book Symbius
          </Link>
          <div className="flex gap-5">
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
