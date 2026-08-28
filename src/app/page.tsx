import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const features = [
  {
    n: "01",
    title: "Funil curto",
    body: "Serviço, data e horário no mesmo fluxo — menos cliques, mais conversão.",
  },
  {
    n: "02",
    title: "Checkout integrado",
    body: "Pix e cartão na última tela, sem redirecionar. Slot em hold até confirmar.",
  },
  {
    n: "03",
    title: "Multi-tenant",
    body: "Cada empresa com páginas, serviços, disponibilidade e chaves próprias.",
  },
];

export default function HomePage() {
  return (
    <div className="dot-grid min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <BrandLogo href="/" size="sm" showText />
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#produto" className="hover:text-foreground">
              Produto
            </a>
            <a href="#recursos" className="hover:text-foreground">
              Recursos
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary !py-1.5 !text-xs sm:!text-sm">
              Entrar
            </Link>
            <Link href="/signup" className="btn-primary !py-1.5 !text-xs sm:!text-sm">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pt-28">
          <p className="eyebrow mb-4">Agendamento + pagamento</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-6xl md:leading-[1.05]">
            Agende. Cobre. Confirme — tudo na mesma tela.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            Infraestrutura de scheduling com checkout transparente Mercado Pago.
            Visual limpo, fluxo curto, cobrança sem sair da página.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary px-5 py-2.5">
              Criar conta
            </Link>
            <Link href="/login" className="btn-secondary px-5 py-2.5">
              Já tenho conta
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="tag">Next.js</span>
            <span className="tag">Mercado Pago</span>
            <span className="tag">Pix + Cartão</span>
            <span className="tag">Multi-tenant</span>
          </div>
        </section>

        <section id="produto" className="border-y border-border bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="surface overflow-hidden">
              <div className="border-b border-border bg-muted-bg/50 px-4 py-2.5 text-xs text-muted">
                /p/sua-pagina · funil público
              </div>
              <div className="grid md:grid-cols-2">
                <div className="space-y-3 border-b border-border p-8 md:border-b-0 md:border-r">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-white">
                    AG
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">Consulta padrão</h2>
                  <p className="text-sm text-muted">30 minutos · R$ 390,00</p>
                  <p className="text-sm leading-relaxed text-muted">
                    Escolha o serviço, a data e pague sem redirecionamento.
                  </p>
                </div>
                <div className="space-y-3 p-8">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Passos
                  </p>
                  {["Serviço", "Data e hora", "Dados", "Pagamento"].map(
                    (s, i) => (
                      <div
                        key={s}
                        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted-bg text-xs font-semibold text-muted">
                          {i + 1}
                        </span>
                        {s}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow mb-3">Recursos</p>
          <h2 className="mb-12 text-3xl font-bold tracking-tight md:text-4xl">
            Feito para operar de verdade
          </h2>
          <div className="grid gap-10 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.n} className="space-y-3">
                <span className="text-4xl font-bold tracking-tight text-border">
                  {f.n}
                </span>
                <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center">
            <BrandLogo size="sm" showText />
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/privacidade" className="hover:text-foreground">
                Privacidade
              </Link>
              <Link href="/termos" className="hover:text-foreground">
                Termos
              </Link>
            </nav>
            <span>Um produto Symbius · Pagamentos via Mercado Pago</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
