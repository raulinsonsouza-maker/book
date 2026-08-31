import Image from "next/image";
import Link from "next/link";

const SEGMENTS = [
  {
    title: "Barbearia",
    body: "Cadeiras cheias, encaixe sem buraco e pagamento antes de sentar.",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Salão de beleza",
    body: "Equipe alinhada, horários por profissional e gestão à vista no dia.",
    image:
      "https://images.unsplash.com/photo-1629397685944-7073f5589754?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Clínica e estética",
    body: "Serviços com duração e preço claros. Cliente confirma e paga no link.",
    image:
      "https://images.unsplash.com/photo-1700760933574-9f0f4ea9aa3b?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Consultório",
    body: "Uma página com sua marca. Menos ida e volta no WhatsApp.",
    image:
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Esmalteria",
    body: "Alta rotatividade sem fila: o link preenche a semana sozinho.",
    image:
      "https://images.unsplash.com/photo-1619607146034-5a05296c8f9a?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Estúdio e bem-estar",
    body: "Sessões, retornos e caixa juntos — do horário marcado ao Pix.",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
  },
] as const;

function HeroVisual() {
  return (
    <div className="lp-mock mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-[1.75rem] border border-[var(--lp-line)] bg-white shadow-[0_28px_60px_-28px_rgba(12,18,34,0.35)]">
        <div className="grid md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[260px] md:min-h-[420px]">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80"
              alt="Profissional de salão atendendo cliente"
              fill
              priority
              className="object-cover object-[center_25%]"
              sizes="(max-width: 768px) 100vw, 55vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1222]/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-white/10" />
            <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-[var(--lp-ink)] shadow-sm backdrop-blur">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--lp-accent)]" />
                Salão · link no WhatsApp, horário pago
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4 bg-[#f8fafb] p-5 md:p-7">
            <div className="lp-ui-sheet !shadow-none border border-[var(--lp-line)] p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                    Agenda de hoje
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold tracking-tight">
                    Sexta-feira, 14 de agosto
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-[var(--lp-accent-soft)] px-2 py-1 text-[11px] font-bold text-[var(--lp-accent)]">
                  4 confirmados
                </span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {[
                  { t: "09:00", s: "Corte + escova", p: "Ana", ok: true },
                  { t: "10:00", s: "Coloração", p: "Marina", ok: true },
                  { t: "11:30", s: "Escova modelada", p: "Paula", ok: false },
                  { t: "14:30", s: "Hidratação", p: "Carla", ok: true },
                ].map((row) => (
                  <li key={row.t} className="flex items-center gap-3 text-sm">
                    <span className="w-12 shrink-0 font-semibold tabular-nums text-[var(--lp-accent)]">
                      {row.t}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {row.s}
                      <span className="text-[#94a3b8]"> · {row.p}</span>
                    </span>
                    {row.ok ? (
                      <span className="shrink-0 text-[11px] font-semibold text-emerald-600">
                        Ok
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-semibold text-[#94a3b8]">
                        —
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-[#94a3b8]">
                Lembrete enviado · horário reservado até o Pix
              </p>
            </div>

            <div className="rounded-xl bg-[#0c1222] px-4 py-3.5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                    Acabou de pagar
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">Coloração · Pix</p>
                </div>
                <p className="font-display text-lg font-bold tracking-tight">
                  R$ 180
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="lp-shell min-h-screen">
      <header className="lp-nav sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={28} height={28} priority />
            <span className="font-display text-[15px] font-bold tracking-tight">
              Book Symbius
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--lp-steel)] md:flex">
            <a href="#o-que-e" className="transition hover:text-[var(--lp-ink)]">
              O que é
            </a>
            <a href="#produto" className="transition hover:text-[var(--lp-ink)]">
              Produto
            </a>
            <a href="#pagamento" className="transition hover:text-[var(--lp-ink)]">
              Pagamento
            </a>
            <a href="#salao" className="transition hover:text-[var(--lp-ink)]">
              Salão
            </a>
            <a href="#segmentos" className="transition hover:text-[var(--lp-ink)]">
              Segmentos
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3.5 py-2 text-sm font-semibold text-[var(--lp-steel)] transition hover:text-[var(--lp-ink)]"
            >
              Entrar
            </Link>
            <Link href="/signup" className="lp-cta !px-4 !py-2 !text-sm">
              Crie sua conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="relative z-10 mx-auto max-w-6xl px-5 pb-12 pt-12 md:px-6 md:pb-16 md:pt-16">
            <div className="mx-auto max-w-3xl text-center">
              <p className="lp-fade lp-brand text-[clamp(2.6rem,8.5vw,5.25rem)] text-[var(--lp-ink)]">
                Book Symbius
              </p>
              <p className="lp-fade lp-fade-delay-1 mt-4 text-sm font-semibold tracking-wide text-[var(--lp-accent)] md:text-base">
                Agenda online com cobrança na hora — para salão, barbearia,
                clínica e consultório
              </p>
              <h1 className="lp-fade lp-fade-delay-2 lp-headline mt-5 text-[clamp(1.65rem,4.4vw,2.85rem)] text-[var(--lp-ink)]">
                Seu cliente marca o horário e{" "}
                <span className="font-accent text-[var(--lp-accent)]">paga.</span>{" "}
                Você só atende.
              </h1>
              <p className="lp-fade lp-fade-delay-3 mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--lp-steel)] md:text-lg">
                Em vez de ficar no WhatsApp combinando horário e pedindo Pix,
                você manda um link. A pessoa escolhe o serviço, o dia e paga ali
                mesmo — e o compromisso já entra na sua agenda.
              </p>
              <div className="lp-fade lp-fade-delay-4 mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup" className="lp-cta">
                  Criar minha agenda
                </Link>
                <a href="#o-que-e" className="lp-cta-ghost">
                  Entender em 30 segundos
                </a>
              </div>
              <p className="lp-fade lp-fade-delay-5 mt-5 text-xs text-[var(--lp-steel)] md:text-sm">
                Configure em minutos · Suporte em português
              </p>
            </div>

            <div className="lp-fade lp-fade-delay-5 mt-12 md:mt-14">
              <HeroVisual />
            </div>
          </div>
        </section>

        <section
          id="o-que-e"
          className="border-y border-[var(--lp-line)] bg-white/75"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-6 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="lp-kicker">O que é</p>
              <h2 className="lp-section-title mt-3 text-3xl md:text-4xl">
                Um link seu. Uma agenda sua. O dinheiro{" "}
                <span className="font-accent text-[var(--lp-accent)]">junto.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--lp-steel)] md:text-lg">
                O Book Symbius é o sistema que troca o caderninho e a conversa
                infinita no WhatsApp por uma página de agendamento com a sua
                marca — com Pix e cartão embutidos.
              </p>
            </div>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  n: "1",
                  title: "Você monta os serviços",
                  body: "Cria o que oferece (corte, consulta, sessão…), define preço, duração e horários. Gera um link com a cara do seu negócio.",
                },
                {
                  n: "2",
                  title: "O cliente marca e paga",
                  body: "Abre o link no celular, escolhe dia e horário, preenche o nome e paga com Pix ou cartão — sem baixar app e sem ir para outro site.",
                },
                {
                  n: "3",
                  title: "Você atende com a agenda pronta",
                  body: "Vê quem vem, quem já pagou e o que entra no caixa. Se tiver equipe, cada um tem o próprio horário e a tela de gestão do dia.",
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

            <p className="mt-12 text-center text-sm text-[var(--lp-steel)]">
              Em resumo:{" "}
              <strong className="font-semibold text-[var(--lp-ink)]">
                agendamento + pagamento + painel
              </strong>{" "}
              para quem vive de horário marcado.
            </p>
          </div>
        </section>

        <section id="produto" className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-28">
          <p className="lp-kicker">Na prática</p>
          <h2 className="lp-section-title mt-3 max-w-2xl text-3xl md:text-5xl">
            Do WhatsApp bagunçado para a agenda{" "}
            <span className="font-accent text-[var(--lp-accent)]">em ordem.</span>
          </h2>

          <div className="mt-16 grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
            <div>
              <p className="lp-kicker">Agenda</p>
              <h3 className="lp-section-title mt-2 text-2xl md:text-4xl">
                Sua agenda trabalha por{" "}
                <span className="font-accent text-[var(--lp-accent)]">você.</span>
              </h3>
              <p className="mt-4 text-base leading-relaxed text-[var(--lp-steel)]">
                O link atende quando a porta já fechou. Cliente marca sozinho —
                você só vê horário confirmado e pago.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="lp-check">
                  Cliente agenda pelo link, sem baixar app
                </li>
                <li className="lp-check">
                  Confirmação e lembrete por e-mail reduzem falta
                </li>
                <li className="lp-check">
                  Google Agenda sincroniza e bloqueia horário ocupado
                </li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex text-sm font-semibold text-[var(--lp-accent)] hover:underline"
              >
                Começar agora →
              </Link>
            </div>
            <div className="lp-feature-visual">
              <Image
                src="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=1200&q=80"
                alt="Interior de salão organizado"
                fill
                className="object-cover opacity-90"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-x-4 bottom-4 md:inset-x-6 md:bottom-6">
                <div className="lp-ui-sheet p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                      Semana
                    </p>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      Alta ocupação
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-6 gap-1.5">
                    {["S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                      <div key={`${d}-${i}`} className="space-y-1">
                        <p className="text-center text-[10px] font-semibold text-[#94a3b8]">
                          {d}
                        </p>
                        <div
                          className={`h-10 rounded-md ${
                            i === 4
                              ? "border border-dashed border-[#cbd5e1] bg-white"
                              : i % 2 === 0
                                ? "bg-[var(--lp-accent)]"
                                : "bg-[#0c1222]"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="pagamento"
          className="border-y border-[var(--lp-line)] bg-white/70"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:gap-16 md:px-6 md:py-28">
            <div className="order-2 md:order-1">
              <div className="relative overflow-hidden rounded-[1.5rem] bg-[#0c1222] p-6 text-white md:p-8">
                <p className="font-accent text-[var(--lp-lime)]">
                  uma conversa a menos
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
                  Horário reservado até o pagamento confirmar
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="lp-kicker">Pagamento</p>
              <h3 className="lp-section-title mt-2 text-2xl md:text-4xl">
                Cobre sem mandar o cliente para{" "}
                <span className="font-accent text-[var(--lp-accent)]">outro site.</span>
              </h3>
              <p className="mt-4 text-base leading-relaxed text-[var(--lp-steel)]">
                Pix e cartão na mesma tela em que o cliente marca o horário.
                Mercado Pago ou Asaas. O horário só fica garantido quando o
                pagamento confirma.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="lp-check">Pix com QR na hora · cartão em parcelas</li>
                <li className="lp-check">
                  Horário fica reservado enquanto o cliente paga
                </li>
                <li className="lp-check">
                  Você acompanha o que entrou no painel financeiro
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

        <section id="salao" className="lp-closing">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:gap-16 md:px-6 md:py-28">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--lp-lime)]">
                Modo salão
              </p>
              <h3 className="lp-section-title mt-3 text-3xl text-white md:text-5xl">
                Sábado lotado. Um computador. Toda a equipe{" "}
                <span className="font-accent text-[var(--lp-lime)]">alinhada.</span>
              </h3>
              <p className="mt-5 text-base leading-relaxed text-white/60 md:text-lg">
                Cadastre profissionais, abra a Gestão à vista e acompanhe quem
                está atendendo, quem é o próximo e o que falta — sem gritar pelo
                salão.
              </p>
              <ul className="mt-6 space-y-3 text-white">
                <li className="lp-check !text-white/90 before:!bg-[var(--lp-lime)]">
                  Login por profissional com horários próprios
                </li>
                <li className="lp-check !text-white/90 before:!bg-[var(--lp-lime)]">
                  Grade do dia atualizada o tempo todo
                </li>
                <li className="lp-check !text-white/90 before:!bg-[var(--lp-lime)]">
                  Cliente escolhe o profissional — ou “qualquer disponível”
                </li>
              </ul>
              <Link href="/signup" className="lp-cta-accent mt-8">
                Quero operar como salão
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { who: "Ana", next: "14:00 · Corte + escova", state: "Agora" },
                { who: "Marina", next: "14:30 · Coloração", state: "Próximo" },
                { who: "Carla", next: "15:00 · Hidratação", state: "Fila" },
              ].map((row) => (
                <div
                  key={row.who}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4"
                >
                  <div>
                    <p className="font-semibold tracking-tight text-white">
                      {row.who}
                    </p>
                    <p className="mt-0.5 text-sm text-white/50">{row.next}</p>
                  </div>
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                    {row.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="segmentos" className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-28">
          <p className="lp-kicker">Segmentos</p>
          <h2 className="lp-section-title mt-3 max-w-2xl text-3xl md:text-5xl">
            Feito para o{" "}
            <span className="font-accent text-[var(--lp-accent)]">seu</span>{" "}
            negócio.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--lp-steel)] md:text-lg">
            Quem vive de horário marcado merece um caminho curto: marcar, pagar,
            confirmar. Sem pedaço espalhado em cinco ferramentas.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SEGMENTS.map((seg) => (
              <article key={seg.title} className="lp-segment flex flex-col">
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
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[var(--lp-steel)]">
            Outro segmento? Se a sua operação vive de agenda, o Book Symbius
            serve.{" "}
            <Link href="/signup" className="font-semibold text-[var(--lp-accent)] hover:underline">
              Criar conta →
            </Link>
          </p>
        </section>

        <section className="lp-closing">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-6 md:py-24">
            <div>
              <p className="font-accent text-xl text-[var(--lp-lime)]">
                chova ou faça sol
              </p>
              <h2 className="lp-section-title mt-4 text-3xl text-white md:text-5xl">
                Ser cada dia mais organizado não é para qualquer um. É para quem
                usa{" "}
                <span className="font-accent text-[var(--lp-lime)]">
                  Book Symbius.
                </span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60 md:text-lg">
                Comece o mês com a agenda comprometida e o caixa no mesmo lugar
                do agendamento. Só falta você.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="lp-cta-accent">
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
                Configure em minutos · Cancele quando quiser · Suporte em
                português
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
              <span className="font-display text-sm font-bold tracking-tight text-white">
                Book Symbius
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Agendamento com Pix e cartão na mesma tela — para quem vive de
              horário marcado.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
              Produto
            </p>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              <a href="#produto" className="hover:text-white">
                Funcionalidades
              </a>
              <a href="#pagamento" className="hover:text-white">
                Pagamento
              </a>
              <a href="#salao" className="hover:text-white">
                Modo salão
              </a>
              <a href="#segmentos" className="hover:text-white">
                Segmentos
              </a>
            </nav>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
              Conta
            </p>
            <nav className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/signup" className="hover:text-white">
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
