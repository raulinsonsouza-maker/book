import Image from "next/image";
import Link from "next/link";

const SEGMENTS = [
  {
    title: "Barbearia",
    body: "Cadeiras cheias, encaixe sem buraco e pagamento antes de sentar.",
    href: "/barbearias",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Salão de beleza",
    body: "Equipe alinhada, horários por profissional e gestão à vista no dia.",
    href: "/salao-de-beleza",
    image:
      "https://images.unsplash.com/photo-1629397685944-7073f5589754?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Clínica e estética",
    body: "Serviços com duração e preço claros. Cliente confirma e paga no link.",
    href: "/clinica-e-estetica",
    image:
      "https://images.unsplash.com/photo-1700760933574-9f0f4ea9aa3b?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Consultório",
    body: "Uma página com sua marca. Menos ida e volta no WhatsApp.",
    href: "/consultorio",
    image:
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Esmalteria",
    body: "Alta rotatividade sem fila: o link preenche a semana sozinho.",
    href: "/esmalteria",
    image:
      "https://images.unsplash.com/photo-1619607146034-5a05296c8f9a?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Estúdio e bem-estar",
    body: "Sessões, retornos e caixa juntos: do horário marcado ao Pix.",
    href: "/estudio-e-bem-estar",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
  },
] as const;

const DAY_CHANGES = [
  {
    title: "Cliente que some",
    before: "Anota o horário no caderno e desaparece. Você só fica sabendo na hora.",
    after: "Só entra na agenda quem já pagou. Quem não paga, não segura horário.",
  },
  {
    title: "Sinal no WhatsApp",
    before: "Pedir depósito é chato pra você e constrangedor pro cliente.",
    after: "Pix ou cartão entram junto com a marcação. Acabou a conversa.",
  },
  {
    title: "Fechamento do dia",
    before: "Descobrir quanto entrou virou aquela soma de cabeça no fim da tarde.",
    after: "Cada pagamento já cai registrado, por serviço e por profissional.",
  },
] as const;

const FAQS = [
  {
    q: "O cliente precisa baixar algum aplicativo?",
    a: "Não. O link abre direto no navegador do celular. Ele escolhe o horário, paga e recebe a confirmação por e-mail. Sem cadastro complicado, sem app ocupando espaço.",
  },
  {
    q: "E se eu já uso Google Agenda?",
    a: "Você conecta uma vez e pronto: o horário reservado vira evento, o cancelamento tira o evento e o que já está ocupado bloqueia sozinho no link público.",
  },
  {
    q: "Funciona para mais de um profissional?",
    a: "Sim. Cada profissional tem login, horários próprios e a tela do próprio dia. O cliente escolhe com quem quer atender, ou pega o primeiro horário livre.",
  },
  {
    q: "Em quanto tempo consigo começar?",
    a: "Cadastre o primeiro serviço em poucos minutos e já dá para mandar o link para um cliente real testar. O resto você ajusta no uso.",
  },
] as const;

function HeroMock() {
  return (
    <div className="lp-mock relative mx-auto w-full max-w-md">
      <div className="rounded-[1.5rem] bg-[#0c1222] p-5 text-white shadow-[0_28px_60px_-28px_rgba(12,18,34,0.45)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              Acabou de pagar
            </p>
            <p className="mt-0.5 text-sm text-white/70">Coloração · Pix</p>
          </div>
          <p className="font-display text-2xl font-bold tracking-tight">
            R$ 180
          </p>
        </div>
        <div className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-xs text-white/60">
          Horário garantido: <span className="font-semibold text-white">sáb, 10h00</span>
        </div>
      </div>

      <div className="lp-ui-sheet -mt-3 ml-6 mr-2 p-4 md:ml-10">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Hoje
          </p>
          <span className="rounded-lg bg-[var(--lp-accent-soft)] px-2 py-1 text-[11px] font-bold text-[var(--lp-accent)]">
            3 pagos · 1 reservado
          </span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {[
            { t: "09:00", s: "Corte + escova", ok: true },
            { t: "10:00", s: "Coloração", ok: true },
            { t: "11:30", s: "Escova modelada", ok: false },
            { t: "14:30", s: "Hidratação", ok: true },
          ].map((row) => (
            <li key={row.t} className="flex items-center gap-3 text-sm">
              <span className="w-11 shrink-0 font-semibold tabular-nums text-[var(--lp-accent)]">
                {row.t}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{row.s}</span>
              <span
                className={`shrink-0 text-[11px] font-semibold ${
                  row.ok ? "text-emerald-600" : "text-[#94a3b8]"
                }`}
              >
                {row.ok ? "Pago" : "Reservado"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HomePageVariantB() {
  return (
    <div className="lp-shell min-h-screen" data-lp-variant="b">
      <header className="lp-nav sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={28} height={28} priority />
            <span className="font-brand text-[15px] tracking-tight text-[var(--lp-ink)]">
              Book Symbius
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--lp-steel)] md:flex">
            <a href="#o-que-muda" className="transition hover:text-[var(--lp-ink)]">
              O que muda
            </a>
            <a href="#como-funciona" className="transition hover:text-[var(--lp-ink)]">
              Como funciona
            </a>
            <a href="#pagamento" className="transition hover:text-[var(--lp-ink)]">
              Pagamento
            </a>
            <a href="#duvidas" className="transition hover:text-[var(--lp-ink)]">
              Dúvidas
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3.5 py-2 text-sm font-semibold text-[var(--lp-steel)] transition hover:text-[var(--lp-ink)]"
            >
              Entrar
            </Link>
            <Link href="/onboarding" className="lp-cta !px-4 !py-2 !text-sm">
              Crie sua conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-14 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-14 md:px-6 md:pb-24 md:pt-20">
            <div>
              <p className="lp-kicker">Agendamento com cobrança</p>
              <h1 className="lp-fade lp-hero-brand mt-4 !text-[var(--lp-ink)]">
                Menos <span className="font-accent">“posso remarcar?”,</span>{" "}
                mais horário pago.
              </h1>
              <p className="lp-fade lp-fade-delay-1 mt-5 max-w-xl text-base leading-relaxed text-[var(--lp-steel)] md:text-lg">
                O Book Symbius é um link com a cara do seu negócio onde o
                cliente escolhe o horário e paga na hora, no Pix ou no cartão. Se o
                pagamento não confirma, o horário continua livre para outra
                pessoa.
              </p>
              <div className="lp-fade lp-fade-delay-2 mt-8 flex flex-wrap gap-3">
                <Link href="/onboarding" className="lp-cta">
                  Criar minha agenda
                </Link>
                <a href="#como-funciona" className="lp-cta-ghost">
                  Ver como funciona
                </a>
              </div>
              <p className="lp-fade lp-fade-delay-3 mt-5 text-xs text-[var(--lp-steel)]">
                Leva poucos minutos para configurar · cancela quando quiser
              </p>
            </div>
            <div className="lp-fade lp-fade-delay-2">
              <HeroMock />
            </div>
          </div>
        </section>

        <section
          id="o-que-muda"
          className="border-y border-[var(--lp-line)] bg-white/75"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-6 md:py-20">
            <div className="max-w-2xl">
              <p className="lp-kicker">O que muda</p>
              <h2 className="lp-section-title mt-3 text-3xl md:text-4xl">
                A mesma rotina, sem a parte chata.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--lp-steel)]">
                Três cenas que se repetem toda semana em salão, barbearia e
                consultório. Em todas, o link muda o final.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {DAY_CHANGES.map((row) => (
                <div
                  key={row.title}
                  className="flex flex-col rounded-2xl border border-[var(--lp-line)] bg-white p-5 md:p-6"
                >
                  <h3 className="font-display text-lg font-bold tracking-tight">
                    {row.title}
                  </h3>
                  <div className="mt-4">
                    <span className="inline-block rounded-md bg-[var(--lp-mist)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--lp-steel)]">
                      Antes
                    </span>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--lp-steel)]">
                      {row.before}
                    </p>
                  </div>
                  <svg
                    className="mt-4 h-4 w-4 shrink-0 text-[var(--lp-accent)]"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M8 2v9m0 0L4.5 7.5M8 11l3.5-3.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-3 rounded-xl bg-[#f0fdfa] p-3.5">
                    <span className="inline-block rounded-md bg-[var(--lp-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--lp-accent)]">
                      Depois
                    </span>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--lp-ink)]">
                      {row.after}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-24">
          <p className="lp-kicker">Como funciona</p>
          <h2 className="lp-section-title mt-3 max-w-2xl text-3xl md:text-4xl">
            Três passos e o link já está no seu WhatsApp.
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              {
                n: "1",
                title: "Você cadastra o que faz",
                body: "Serviço, preço, duração e os horários de cada profissional. O link sai com a cara do seu negócio, não com cara de sistema genérico.",
              },
              {
                n: "2",
                title: "Manda o link, o cliente resolve",
                body: "Ele abre no celular, escolhe o horário livre e paga. Sem baixar app, sem criar conta, sem aquela sequência de áudio trocando horário.",
              },
              {
                n: "3",
                title: "Você atende, o caixa está pronto",
                body: "A agenda do dia mostra quem vem e quem já pagou. Trabalha com equipe? Cada um tem login, horário próprio e a própria tela.",
              },
            ].map((step) => (
              <li key={step.n} className="text-left">
                <span className="font-display text-4xl font-extrabold tracking-tight text-[var(--lp-accent)]/25">
                  {step.n}
                </span>
                <h3 className="lp-section-title mt-2 text-xl md:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lp-steel)] md:text-[15px]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="pagamento"
          className="border-y border-[var(--lp-line)] bg-white/70"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:gap-16 md:px-6 md:py-24">
            <div className="order-2 md:order-1">
              <div className="relative overflow-hidden rounded-[1.5rem] bg-[#0c1222] p-6 text-white md:p-8">
                <p className="font-accent text-[var(--lp-lime)]">
                  a conversa que não acontece
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    { label: "Serviço", value: "Coloração · 2h" },
                    { label: "Quando", value: "Sáb, 15 ago · 10:00" },
                    { label: "Pagar", value: "Pix ou cartão" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                    >
                      <span className="text-sm text-white/45">{row.label}</span>
                      <span className="text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl bg-[var(--lp-lime)] px-4 py-3.5 text-center text-sm font-bold text-[var(--lp-ink)]">
                  Confirmar e pagar R$ 180
                </div>
                <p className="mt-3 text-center text-xs text-white/40">
                  Enquanto não paga, o horário fica só reservado
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="lp-kicker">Pagamento</p>
              <h3 className="lp-section-title mt-2 text-2xl md:text-4xl">
                O dinheiro no mesmo lugar do horário.
              </h3>
              <p className="mt-4 text-base leading-relaxed text-[var(--lp-steel)]">
                Pix com QR na hora ou cartão em parcelas, na tela em que o
                cliente marca. Depois que o pagamento confirma, o horário é
                dele de verdade. Mercado Pago ou Asaas, e tudo registrado no
                painel financeiro.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="lp-check">Pix na hora · cartão em parcelas</li>
                <li className="lp-check">
                  Sem pagamento, sem horário garantido
                </li>
                <li className="lp-check">
                  Caixa do dia visível, sem soma de cabeça
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Image
                  src="/mercadopago-logo.png"
                  alt="Mercado Pago"
                  width={130}
                  height={36}
                  className="h-7 w-auto object-contain opacity-80"
                />
                <Image
                  src="/asaas.webp"
                  alt="Asaas"
                  width={90}
                  height={32}
                  className="h-6 w-auto object-contain opacity-80"
                />
                <Image
                  src="/google-calendar-logo.png"
                  alt="Google Calendar"
                  width={120}
                  height={36}
                  className="h-7 w-auto object-contain opacity-80"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="duvidas" className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-24">
          <div className="max-w-2xl">
            <p className="lp-kicker">Dúvidas de quem já atende</p>
            <h2 className="lp-section-title mt-3 text-3xl md:text-4xl">
              O que todo mundo pergunta antes de começar.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-[var(--lp-line)] bg-white p-5 md:p-6"
              >
                <h3 className="font-display text-lg font-bold tracking-tight">
                  {faq.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lp-steel)]">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="segmentos" className="border-t border-[var(--lp-line)] bg-white/70">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-24">
            <p className="lp-kicker">Segmentos</p>
            <h2 className="lp-section-title mt-3 max-w-2xl text-3xl md:text-5xl">
              Feito para quem vive de horário marcado.
            </h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SEGMENTS.map((seg) => (
                <Link
                  key={seg.title}
                  href={seg.href}
                  className="lp-segment flex flex-col"
                >
                  <Image
                    src={seg.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="lp-segment-copy">
                    <h3 className="font-display text-xl font-bold tracking-tight">
                      {seg.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed">{seg.body}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-closing">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-6 md:py-24">
            <div>
              <p className="font-accent text-xl text-[var(--lp-lime)]">
                segunda sem surpresa
              </p>
              <h2 className="lp-section-title mt-4 text-3xl text-white md:text-5xl">
                A semana que vem já pode chegar lotada. E paga.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60 md:text-lg">
                Crie a conta, cadastre um serviço e mande o link hoje mesmo. Se
                não fizer sentido para o seu negócio, é só cancelar.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/onboarding" className="lp-cta-accent">
                  Criar minha agenda
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-white/80 hover:text-white"
                >
                  Já tenho conta →
                </Link>
              </div>
              <p className="mt-5 text-xs text-white/40">
                Sem instalação · Suporte em português · Cancela quando quiser
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80"
                  alt="Profissional de barbearia"
                  fill
                  className="object-cover"
                  sizes="40vw"
                />
              </div>
              <div className="relative mt-8 aspect-[3/4] overflow-hidden rounded-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=700&q=80"
                  alt="Profissional de salão"
                  fill
                  className="object-cover"
                  sizes="40vw"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#080c16] text-white/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-6">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt=""
                width={24}
                height={24}
                className="brightness-0 invert"
              />
              <span className="font-brand text-sm tracking-tight text-white">
                Book Symbius
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Link de agendamento com Pix e cartão na mesma tela, para quem
              vive de horário marcado.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
              Produto
            </p>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              <a href="#como-funciona" className="hover:text-white">
                Como funciona
              </a>
              <a href="#pagamento" className="hover:text-white">
                Pagamento
              </a>
              <a href="#duvidas" className="hover:text-white">
                Dúvidas
              </a>
            </nav>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
              Conta
            </p>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/onboarding" className="hover:text-white">
                Crie sua conta
              </Link>
              <Link href="/login" className="hover:text-white">
                Entrar
              </Link>
              <Link href="/privacidade" className="hover:text-white">
                Privacidade
              </Link>
              <Link href="/termos" className="hover:text-white">
                Termos
              </Link>
            </nav>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-5 py-5 text-sm md:px-6">
            © {new Date().getFullYear()} Book Symbius · Um produto Symbius
          </p>
        </div>
      </footer>
    </div>
  );
}
