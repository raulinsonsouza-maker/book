import type { Metadata } from "next";
import { NicheLanding } from "@/components/marketing/NicheLanding";

export const metadata: Metadata = {
  title: "Agenda pra clínica e estética — Book Symbius",
  description:
    "Serviços com duração e preço claros. Cliente confirma e paga no link — sua clínica reduz falta e ganha previsibilidade.",
};

export default function ClinicaEEsteticaPage() {
  return (
    <NicheLanding
      content={{
        tipo: "clinica-e-estetica",
        theme: "clinic",
        hero: {
          src: "/lp/clinic-hero.jpg",
          alt: "Procedimento estético em clínica",
          objectPosition: "object-[center_35%]",
        },
        photo: {
          src: "/lp/clinic1.jpg",
          alt: "Ambiente de clínica de estética",
        },
        headline: (
          <>
            Procedimento marcado{" "}
            <span className="font-accent niche-lp-accent">
              e pago antes de chegar.
            </span>
          </>
        ),
        lead: "Duração clara, preço transparente e confirmação no link. Sua clínica reduz falta e enche a agenda com quem realmente vem.",
        ctaPrimary: "Montar agenda da clínica",
        pain: {
          kicker: "O que quebra a escala",
          title: (
            <>
              Sala reservada.{" "}
              <span className="font-accent niche-lp-accent">
                Paciente some.
              </span>
            </>
          ),
          body: "Laser, peeling, limpeza — cada slot custa preparo e tempo de profissional. Quando a pessoa desmarca em cima da hora (ou não aparece), o dia inteiro desanda e o faturamento vai junto.",
        },
        money: {
          kicker: "Agenda que protege o caixa",
          title: (
            <>
              Quem quer o procedimento{" "}
              <span className="font-accent niche-lp-accent">
                garante com pagamento.
              </span>
            </>
          ),
          body: "No link, o cliente vê o que vai fazer, quanto tempo leva e quanto custa. Confirma, paga e o horário trava. Você prepara a sala sabendo que o compromisso é sério.",
          points: [
            {
              title: "Preço e duração na mesa",
              body: "Acaba a conversa eterna de “quanto fica?” no WhatsApp.",
            },
            {
              title: "Menos falta na maca",
              body: "Quem pagou aparece. A escala para de furar.",
            },
            {
              title: "Retorno no fluxo",
              body: "Sessões e retornos entram na mesma lógica — sem esquecer ninguém.",
            },
          ],
        },
        flow: {
          kicker: "Na rotina da clínica",
          title: (
            <>
              Do interesse ao procedimento —{" "}
              <span className="font-accent niche-lp-accent">sem atrito.</span>
            </>
          ),
          steps: [
            {
              title: "Paciente abre o link da clínica",
              body: "Escolhe limpeza, laser, intradermoterapia — com tempo e valor claros.",
            },
            {
              title: "Confirma e paga na hora",
              body: "O slot só ocupa a agenda quando o pagamento fecha. Simples e profissional.",
            },
            {
              title: "Sua equipe atende no horário",
              body: "Lembrete vai pro paciente. Sala pronta. Você foca no protocolo, não na cobrança.",
            },
          ],
        },
        proof: {
          kicker: "Clínica com escala firme",
          title: (
            <>
              Enquanto uns ainda cobram depois,{" "}
              <span className="font-accent niche-lp-accent">
                a sua sala já está reservada de verdade.
              </span>
            </>
          ),
          body: "Mais previsibilidade. Menos ociosidade. Um padrão de atendimento que transmite cuidado — e protege o faturamento.",
          cta: "Quero proteger minha agenda",
        },
        close: {
          title: (
            <>
              Pronto pra lotar a clínica{" "}
              <span className="font-accent niche-lp-accent">
                com quem realmente vem?
              </span>
            </>
          ),
          body: "Cadastre os procedimentos, defina duração e preço, compartilhe o link. A agenda da estética começa a se preencher com compromisso pago.",
          cta: "Criar agenda da clínica",
        },
      }}
    />
  );
}
