import type { Metadata } from "next";
import { NicheLanding } from "@/components/marketing/NicheLanding";

export const metadata: Metadata = {
  title: "Agenda pra consultório — Book Symbius",
  description:
    "Uma página com a sua marca. Menos ida e volta no WhatsApp. Paciente marca e você atende com a agenda organizada.",
};

export default function ConsultorioPage() {
  return (
    <NicheLanding
      content={{
        tipo: "consultorio",
        theme: "consult",
        hero: {
          src: "/lp/consult-hero.jpg",
          alt: "Consultório moderno pronto para atendimento",
          objectPosition: "object-[center_40%]",
        },
        photo: {
          src: "/lp/consult1.jpg",
          alt: "Ambiente de consultório",
        },
        headline: (
          <>
            Sua marca na frente.{" "}
            <span className="font-accent niche-lp-accent">
              O WhatsApp deixa de ser recepção.
            </span>
          </>
        ),
        lead: "Uma página com o nome do consultório, horários claros e menos mensagem pra combinar consulta. O paciente marca — você atende.",
        ctaPrimary: "Montar agenda do consultório",
        pain: {
          kicker: "O que rouba seu foco",
          title: (
            <>
              Consulta boa.{" "}
              <span className="font-accent niche-lp-accent">
                Secretaria improvisada no celular.
              </span>
            </>
          ),
          body: "“Tem horário quinta?”. “Pode remarcar?”. “Quanto é?”. Enquanto você responde, a próxima consulta atrasa e a imagem do consultório vira bagunça de print.",
        },
        money: {
          kicker: "Agenda que valoriza o consultório",
          title: (
            <>
              Página com a sua cara —{" "}
              <span className="font-accent niche-lp-accent">
                e horário que não some.
              </span>
            </>
          ),
          body: "O paciente entra no seu link, vê os serviços, escolhe o dia e confirma. Você reduz o vai-e-volta, protege o tempo da consulta e passa mais profissionalismo desde o primeiro contato.",
          points: [
            {
              title: "Menos WhatsApp",
              body: "Quem quer marcar usa o link. Você para de ser agenda ambulante.",
            },
            {
              title: "Consulta no horário",
              body: "Lembrete vai pro paciente. A sala para de ficar esperando.",
            },
            {
              title: "Marca na frente",
              body: "Uma página limpa com o nome do consultório — não um link genérico.",
            },
          ],
        },
        flow: {
          kicker: "No dia a dia do consultório",
          title: (
            <>
              Do contato à consulta —{" "}
              <span className="font-accent niche-lp-accent">sem atrito.</span>
            </>
          ),
          steps: [
            {
              title: "Paciente abre a página do consultório",
              body: "Vê avaliação, retorno, procedimento — com tempo estimado e valor quando fizer sentido.",
            },
            {
              title: "Escolhe o horário e confirma",
              body: "Acaba o pingue-pongue. O compromisso entra na sua agenda de forma clara.",
            },
            {
              title: "Você atende com a cabeça no paciente",
              body: "Lembrete sai automático. Você abre o dia organizado e foca no atendimento.",
            },
          ],
        },
        proof: {
          kicker: "Consultório sem correria",
          title: (
            <>
              Enquanto outros ainda marcam no zap,{" "}
              <span className="font-accent niche-lp-accent">
                o seu dia já está alinhado.
              </span>
            </>
          ),
          body: "Mais tempo clínico. Menos tempo administrativo. Uma presença digital que combina com o nível do seu atendimento.",
          cta: "Quero organizar meu consultório",
        },
        close: {
          title: (
            <>
              Pronto pra tirar a agenda{" "}
              <span className="font-accent niche-lp-accent">
                do WhatsApp?
              </span>
            </>
          ),
          body: "Crie a página do consultório, configure os horários e compartilhe o link. Em minutos o fluxo de marcação muda de patamar.",
          cta: "Criar agenda do consultório",
        },
      }}
    />
  );
}
