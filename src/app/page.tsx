import Image from "next/image";
import Link from "next/link";

function ProductMock() {
  return (
    <div className="lp-mock relative mx-auto w-full max-w-5xl">
      <div className="pointer-events-none absolute -inset-x-10 -bottom-8 top-16 rounded-[2.5rem] bg-gradient-to-b from-black/[0.04] to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_40px_80px_-28px_rgba(10,10,10,0.35)]">
        <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#fafafa] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e5e7eb]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e5e7eb]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e5e7eb]" />
          <span className="ml-3 truncate text-[11px] font-medium text-[#9ca3af]">
            book.symbius.com.br/p/sua-empresa/agenda
          </span>
        </div>
        <div className="grid md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 border-b border-black/[0.06] p-6 md:border-b-0 md:border-r md:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0a0a0a]">
                <Image
                  src="/logo.png"
                  alt=""
                  width={22}
                  height={22}
                  className="brightness-0 invert"
                />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
                  Symbius
                </p>
                <p className="text-sm font-semibold tracking-tight">
                  Consultoria estratégica
                </p>
              </div>
            </div>
            <div>
              <p className="lp-section-title text-2xl tracking-tight md:text-[1.75rem]">
                Escolha o dia e o horário
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
                Funil público com sua marca — o cliente agenda e paga sem sair da
                página.
              </p>
            </div>
            <div className="flex gap-2 overflow-hidden">
              {["Qua 02", "Qui 03", "Sex 04", "Sáb 05"].map((d, i) => (
                <span
                  key={d}
                  className={`min-w-[4.25rem] rounded-2xl px-3 py-3 text-center text-xs font-semibold ${
                    i === 0
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#f3f4f6] text-[#4b5563]"
                  }`}
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {["09:00", "14:00", "15:00", "16:30"].map((t, i) => (
                <span
                  key={t}
                  className={`rounded-xl border px-2 py-2.5 text-center text-sm font-semibold ${
                    i === 1
                      ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                      : "border-[#e5e7eb] bg-white text-[#111827]"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-4 bg-[#f8f9fb] p-6 md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ca3af]">
              No mesmo fluxo
            </p>
            {[
              { label: "Serviço", value: "Consultoria · 60 min" },
              { label: "Horário", value: "Qua, 2 set · 14:00" },
              { label: "Pagamento", value: "Pix ou cartão" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3.5"
              >
                <span className="text-xs font-medium text-[#9ca3af]">
                  {row.label}
                </span>
                <span className="text-sm font-semibold tracking-tight">
                  {row.value}
                </span>
              </div>
            ))}
            <div className="rounded-2xl bg-[#0a0a0a] px-4 py-3.5 text-center text-sm font-semibold text-white">
              Confirmar e pagar
            </div>
            <p className="text-center text-[11px] text-[#9ca3af]">
              Slot reservado até o pagamento confirmar
            </p>
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
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#5b6472] md:flex">
            <a href="#produto" className="transition hover:text-[#0a0a0a]">
              Produto
            </a>
            <a href="#salao" className="transition hover:text-[#0a0a0a]">
              Salão
            </a>
            <a href="#pagamento" className="transition hover:text-[#0a0a0a]">
              Pagamento
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#5b6472] transition hover:text-[#0a0a0a]"
            >
              Entrar
            </Link>
            <Link href="/signup" className="lp-cta !px-4 !py-2 !text-sm">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — brand + one message + CTA + product visual */}
        <section className="lp-hero">
          <div className="relative z-10 mx-auto max-w-6xl px-5 pb-10 pt-14 md:px-6 md:pb-14 md:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="lp-fade lp-brand text-[clamp(2.75rem,9vw,5.5rem)] text-[#0a0a0a]">
                Book Symbius
              </p>
              <h1 className="lp-fade lp-fade-delay-1 lp-headline mt-5 text-[clamp(1.55rem,4.2vw,2.65rem)] text-[#0a0a0a]">
                Agenda cheia. Pagamento na hora. Operação no piloto.
              </h1>
              <p className="lp-fade lp-fade-delay-2 mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#5b6472] md:text-lg">
                Seu cliente escolhe o horário, paga com Pix ou cartão e você
                acompanha tudo no painel — do consultório solo ao salão lotado.
              </p>
              <div className="lp-fade lp-fade-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup" className="lp-cta">
                  Criar minha agenda
                </Link>
                <a href="#produto" className="lp-cta-ghost">
                  Ver como funciona
                </a>
              </div>
            </div>

            <div className="lp-fade lp-fade-delay-4 mt-14 md:mt-16">
              <ProductMock />
            </div>
          </div>
        </section>

        {/* Para quem */}
        <section className="border-y border-black/[0.06] bg-white/70">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3 md:gap-8 md:px-6 md:py-20">
            {[
              {
                title: "Consultórios",
                body: "Uma agenda pública com sua marca. Menos WhatsApp, mais horário confirmado.",
              },
              {
                title: "Clínicas",
                body: "Vários serviços, lembretes e pagamento antes do atendimento.",
              },
              {
                title: "Salões",
                body: "Equipe, horários por profissional e tela de gestão à vista no salão.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-3">
                <h2 className="lp-section-title text-xl md:text-2xl">
                  {item.title}
                </h2>
                <p className="text-sm leading-relaxed text-[#5b6472] md:text-[15px]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Produto */}
        <section id="produto" className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b6472]">
              Produto
            </p>
            <h2 className="lp-section-title mt-3 text-3xl md:text-5xl">
              Do clique ao Pix — sem fricção
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5b6472] md:text-lg">
              O funil é curto de propósito: serviço, profissional (se for salão),
              dia, horário e pagamento. O slot fica reservado até confirmar.
            </p>
          </div>

          <ol className="mt-14 grid gap-8 md:grid-cols-3 md:gap-10">
            {[
              {
                n: "01",
                title: "Link com a sua marca",
                body: "Cliente abre sua página, vê serviços e horários reais — sem app para instalar.",
              },
              {
                n: "02",
                title: "Escolhe e reserva",
                body: "Dia e horário em poucos toques. Semana ou mês, do jeito que fizer sentido.",
              },
              {
                n: "03",
                title: "Paga e confirma",
                body: "Pix ou cartão na última tela. Você recebe aviso; o horário entra na agenda.",
              },
            ].map((step) => (
              <li key={step.n} className="relative space-y-3 pt-2">
                <span className="font-display text-4xl font-extrabold tracking-tight text-black/10">
                  {step.n}
                </span>
                <h3 className="lp-section-title text-xl">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#5b6472]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Salão */}
        <section id="salao" className="lp-split">
          <div className="lp-glow-line" />
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:gap-16 md:px-6 md:py-28">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                Modo salão
              </p>
              <h2 className="lp-section-title mt-3 text-3xl text-white md:text-5xl">
                Sábado lotado. Um computador. Toda a equipe alinhada.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/65 md:text-lg">
                Ative o modo salão, cadastre profissionais e abra a{" "}
                <strong className="font-semibold text-white">
                  Gestão à vista
                </strong>
                . Cada um vê o próximo cliente e o procedimento — atualizado o
                tempo todo.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0a0a0a] transition hover:bg-white/90"
              >
                Quero operar como salão
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { who: "Ana", next: "14:00 · Corte + escova", state: "Agora" },
                { who: "Bruno", next: "14:30 · Barba", state: "Próximo" },
                { who: "Carla", next: "15:00 · Coloração", state: "Fila" },
              ].map((row) => (
                <div
                  key={row.who}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4"
                >
                  <div>
                    <p className="font-semibold tracking-tight text-white">
                      {row.who}
                    </p>
                    <p className="mt-0.5 text-sm text-white/55">{row.next}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                    {row.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pagamento */}
        <section
          id="pagamento"
          className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-28"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b6472]">
              Pagamento
            </p>
            <h2 className="lp-section-title mt-3 text-3xl md:text-5xl">
              Cobre sem mandar o cliente para outro site
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5b6472] md:text-lg">
              Mercado Pago, Asaas e Cakto. Pix e cartão no final do funil —
              transparente, com o horário seguro até a confirmação.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-6 md:gap-10">
            <Image
              src="/mercadopago-logo.png"
              alt="Mercado Pago"
              width={140}
              height={40}
              className="h-8 w-auto object-contain opacity-80"
            />
            <Image
              src="/asaas.webp"
              alt="Asaas"
              width={100}
              height={36}
              className="h-7 w-auto object-contain opacity-80"
            />
            <span className="text-sm font-semibold tracking-tight text-[#5b6472]">
              + Cakto · Google Calendar
            </span>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-black/[0.06] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center md:px-6 md:py-24">
            <h2 className="lp-section-title text-3xl md:text-5xl">
              Pronto para receber o próximo agendamento?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-[#5b6472]">
              Crie a conta, configure a agenda e compartilhe o link. Em minutos
              você já está cobrando e confirmando.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="lp-cta">
                Começar grátis
              </Link>
              <Link href="/login" className="lp-cta-ghost">
                Já tenho conta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.06] bg-[#0a0a0a] text-white/55">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-6">
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
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/privacidade" className="hover:text-white">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-white">
              Termos
            </Link>
            <Link href="/login" className="hover:text-white">
              Entrar
            </Link>
          </nav>
          <p className="text-sm">Um produto Symbius</p>
        </div>
      </footer>
    </div>
  );
}
