import type { Metadata } from "next";
import { NicheLanding } from "@/components/marketing/NicheLanding";

export const metadata: Metadata = {
  title: "Agenda pra barbearia — Book Symbius",
  description:
    "Cadeira cheia, encaixe sem buraco e pagamento antes de sentar. Seu cliente marca e paga no link — você só atende.",
};

export default function BarbeariasPage() {
  return (
    <NicheLanding
      content={{
        tipo: "barbearias",
        theme: "barber",
        logoLight: true,
        hero: {
          src: "/lp/barber-hero.jpg",
          alt: "Cliente sendo atendido na cadeira da barbearia",
          objectPosition: "object-[center_40%]",
        },
        photo: {
          src: "/lp/barber2.jpg",
          alt: "Ambiente de barbearia com cadeiras",
        },
        headline: (
          <>
            Cadeira parada{" "}
            <span className="font-accent niche-lp-accent">não paga conta.</span>
          </>
        ),
        lead: "Seu cliente marca o horário, paga antes de sentar e você atende com a cadeira cheia — sem buraco na agenda.",
        ctaPrimary: "Montar agenda da barbearia",
        pain: {
          kicker: "O que drena o caixa",
          title: (
            <>
              WhatsApp cheio.{" "}
              <span className="font-accent niche-lp-accent">Cadeira vazia.</span>
            </>
          ),
          body: "Falta sem avisar. Encaixe mal feito. Cliente que “confirma” e some. Enquanto você responde mensagem, o horário que podia estar pago vira buraco — e a sexta que podia lotar fica frouxa.",
        },
        money: {
          kicker: "Mais dinheiro na cadeira",
          title: (
            <>
              Quem quer o horário{" "}
              <span className="font-accent niche-lp-accent">
                paga pra garantir.
              </span>
            </>
          ),
          body: "Você manda o link no Instagram ou no WhatsApp. O cliente escolhe corte, barba ou combo, marca o dia e paga ali. O horário só trava quando o Pix ou o cartão confirma — falta cai, encaixe sobe e o dia rende de verdade.",
          points: [
            {
              title: "Cadeira ocupada",
              body: "Agenda fechada com quem já pagou pra sentar.",
            },
            {
              title: "Menos falta",
              body: "Quem pagou aparece. Quem some, você encaixa outro.",
            },
            {
              title: "Dia sem buraco",
              body: "Os horários se enchem sozinhos pelo link.",
            },
          ],
        },
        flow: {
          kicker: "No chão da barbearia",
          title: (
            <>
              Do story ao corte —{" "}
              <span className="font-accent niche-lp-accent">sem enrolação.</span>
            </>
          ),
          steps: [
            {
              title: "Cola o link onde o cliente já te acha",
              body: "Bio do Instagram, status do WhatsApp, cartão na porta. Um toque e ele vê corte, barba, combo e pigmentação com preço e tempo.",
            },
            {
              title: "Ele escolhe o horário e fecha o pagamento",
              body: "Sem “tem vaga amanhã?”. Sem ficar cobrando Pix depois. O compromisso só entra quando o valor cai.",
            },
            {
              title: "Você abre o dia e atende",
              body: "Quem vem, horário, o que vai fazer — tudo claro. Lembrete vai pro cliente. Você foca na cadeira.",
            },
          ],
        },
        proof: {
          kicker: "Sexta lotada de verdade",
          title: (
            <>
              Enquanto uns respondem “tem horário?”,{" "}
              <span className="font-accent niche-lp-accent">
                a sua semana já tá paga.
              </span>
            </>
          ),
          body: "Menos tempo combinando. Mais tempo cortando. Mais gente sentando — e pagando — do jeito que a barbearia precisa pra crescer.",
          cta: "Quero encher a cadeira",
        },
        close: {
          title: (
            <>
              Pronto pra lotar a semana{" "}
              <span className="font-accent niche-lp-accent">
                sem virar secretário?
              </span>
            </>
          ),
          body: "Crie sua agenda, coloque os serviços da casa e manda o link. Em poucos minutos a barbearia já começa a marcar — e a receber.",
          cta: "Criar agenda da barbearia",
        },
      }}
    />
  );
}
