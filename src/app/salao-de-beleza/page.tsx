import type { Metadata } from "next";
import { NicheLanding } from "@/components/marketing/NicheLanding";

export const metadata: Metadata = {
  title: "Agenda pra salão de beleza — Book Symbius",
  description:
    "Equipe alinhada, horário por profissional e o dia do salão sob controle. Cliente marca, paga e você atende.",
};

export default function SalaoDeBelezaPage() {
  return (
    <NicheLanding
      content={{
        tipo: "salao-de-beleza",
        theme: "salon",
        hero: {
          src: "/lp/salon-hero.jpg",
          alt: "Profissional de salão finalizando o visual da cliente",
          objectPosition: "object-[center_30%]",
        },
        photo: {
          src: "/lp/salon2.jpg",
          alt: "Atendimento em salão de beleza",
        },
        headline: (
          <>
            Salão cheio{" "}
            <span className="font-accent niche-lp-accent">
              começa na agenda certa.
            </span>
          </>
        ),
        lead: "Cada profissional com o próprio horário, a equipe alinhada e o caixa do dia à vista — sem brigar por vaga no WhatsApp.",
        ctaPrimary: "Montar agenda do salão",
        pain: {
          kicker: "O que trava o salão",
          title: (
            <>
              Três profissionais.{" "}
              <span className="font-accent niche-lp-accent">
                Uma bagunça de mensagens.
              </span>
            </>
          ),
          body: "Cliente marca com uma, aparece pra outra. Escova sobreposta com coloração. Você perde tempo apagando incêndio enquanto a cadeira que podia estar paga fica esperando.",
        },
        money: {
          kicker: "Mais faturamento por cadeira",
          title: (
            <>
              Cada horário com dono —{" "}
              <span className="font-accent niche-lp-accent">
                e já pago.
              </span>
            </>
          ),
          body: "O cliente escolhe o serviço, a profissional e o horário. Paga no link. A agenda de cada uma fica limpa, o dia rende e a gestão para de ser achismo.",
          points: [
            {
              title: "Horário por profissional",
              body: "Cada uma vê só a própria fila — sem confusão na recepção.",
            },
            {
              title: "Equipe no mesmo ritmo",
              body: "Colorista, cabeleireira e manicure sem atropelo de horário.",
            },
            {
              title: "Dia à vista",
              body: "Você abre a agenda e sabe quem vem, o que faz e o que já entrou.",
            },
          ],
        },
        flow: {
          kicker: "No ritmo do salão",
          title: (
            <>
              Do Instagram à escova —{" "}
              <span className="font-accent niche-lp-accent">sem atrito.</span>
            </>
          ),
          steps: [
            {
              title: "Cliente entra pelo seu link",
              body: "Vê escova, coloração, hidratação, mechas — com tempo e valor. Escolhe quem atende.",
            },
            {
              title: "Paga e confirma o compromisso",
              body: "O horário só trava na agenda da profissional quando o pagamento fecha.",
            },
            {
              title: "Vocês atendem o dia organizado",
              body: "Lembrete chega pra cliente. A equipe sabe a ordem. Você acompanha o movimento.",
            },
          ],
        },
        proof: {
          kicker: "Salão que fatura no ritmo",
          title: (
            <>
              Enquanto a concorrência ainda marca no zap,{" "}
              <span className="font-accent niche-lp-accent">
                a sua semana já está vendida.
              </span>
            </>
          ),
          body: "Menos ida e volta. Mais cadeiras ocupadas. Mais previsibilidade pra equipe — e pro caixa.",
          cta: "Quero organizar meu salão",
        },
        close: {
          title: (
            <>
              Pronto pra colocar a equipe{" "}
              <span className="font-accent niche-lp-accent">
                no mesmo compasso?
              </span>
            </>
          ),
          body: "Monte a agenda, vincule as profissionais aos serviços e compartilhe o link. O salão começa a marcar sozinho.",
          cta: "Criar agenda do salão",
        },
      }}
    />
  );
}
