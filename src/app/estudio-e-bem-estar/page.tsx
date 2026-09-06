import type { Metadata } from "next";
import { NicheLanding } from "@/components/marketing/NicheLanding";

export const metadata: Metadata = {
  title: "Agenda pra estúdio e bem-estar — Book Symbius",
  description:
    "Sessões, retornos e caixa juntos — do horário marcado ao Pix. Seu estúdio organiza a agenda e aumenta a recorrência.",
};

export default function EstudioEBemEstarPage() {
  return (
    <NicheLanding
      content={{
        tipo: "estudio-e-bem-estar",
        theme: "spa",
        hero: {
          src: "/lp/spa-hero.jpg",
          alt: "Ambiente de bem-estar e relaxamento",
          objectPosition: "object-[center_40%]",
        },
        photo: {
          src: "/lp/spa2.jpg",
          alt: "Detalhes de estúdio de bem-estar",
        },
        headline: (
          <>
            Sessão marcada.{" "}
            <span className="font-accent niche-lp-accent">
              Retorno no fluxo. Caixa no lugar.
            </span>
          </>
        ),
        lead: "Massagem, terapia, estética suave — do horário ao Pix no mesmo caminho. Seu estúdio para de perder retorno e começa a prever o mês.",
        ctaPrimary: "Montar agenda do estúdio",
        pain: {
          kicker: "O que esfria o estúdio",
          title: (
            <>
              Cliente ama a sessão.{" "}
              <span className="font-accent niche-lp-accent">
                Esquece de voltar.
              </span>
            </>
          ),
          body: "Você atende bem, mas remarcar vira conversa solta no WhatsApp. Horário fica aberto, retorno some e o caixa do mês fica imprevisível — mesmo com agenda “cheia de intenção”.",
        },
        money: {
          kicker: "Recorrência que paga as contas",
          title: (
            <>
              Do horário marcado ao Pix —{" "}
              <span className="font-accent niche-lp-accent">
                tudo no mesmo elo.
              </span>
            </>
          ),
          body: "A pessoa marca a sessão, paga no link e recebe lembrete. Você enxerga a semana, facilita o retorno e para de correr atrás de confirmação — o estúdio respira e fatura com mais calma.",
          points: [
            {
              title: "Sessões no ritmo certo",
              body: "Agenda clara pra você — e pra quem precisa de constância.",
            },
            {
              title: "Retornos sem cobrança chata",
              body: "O link facilita remarcar. Menos “sumiu depois da primeira”.",
            },
            {
              title: "Caixa junto da agenda",
              body: "Horário confirmado com pagamento. Menos surpresa no fim do mês.",
            },
          ],
        },
        flow: {
          kicker: "No ritmo do estúdio",
          title: (
            <>
              Do primeiro toque à próxima sessão —{" "}
              <span className="font-accent niche-lp-accent">com leveza.</span>
            </>
          ),
          steps: [
            {
              title: "Cliente abre o link do estúdio",
              body: "Vê massagem, drenagem, terapia, ritual — com tempo e valor. Escolhe o momento.",
            },
            {
              title: "Confirma e paga com tranquilidade",
              body: "O horário só trava quando o pagamento fecha. Sem pressão no atendimento.",
            },
            {
              title: "Você recebe e já pensa no retorno",
              body: "Lembrete chega. A sessão acontece. Remarcar fica natural — não forçado.",
            },
          ],
        },
        proof: {
          kicker: "Estúdio com agenda viva",
          title: (
            <>
              Enquanto outros ainda cobram depois da sessão,{" "}
              <span className="font-accent niche-lp-accent">
                o seu mês já tem base.
              </span>
            </>
          ),
          body: "Mais presença. Mais retorno. Um fluxo que respeita o clima do bem-estar — e sustenta o negócio.",
          cta: "Quero organizar meu estúdio",
        },
        close: {
          title: (
            <>
              Pronto pra unir sessão, retorno{" "}
              <span className="font-accent niche-lp-accent">e caixa?</span>
            </>
          ),
          body: "Monte a agenda do estúdio, coloque seus atendimentos e compartilhe o link. O bem-estar continua leve — o negócio fica mais firme.",
          cta: "Criar agenda do estúdio",
        },
      }}
    />
  );
}
