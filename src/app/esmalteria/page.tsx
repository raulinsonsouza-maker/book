import type { Metadata } from "next";
import { NicheLanding } from "@/components/marketing/NicheLanding";

export const metadata: Metadata = {
  title: "Agenda pra esmalteria — Book Symbius",
  description:
    "Alta rotatividade sem fila: o link preenche a semana sozinho. Cliente marca, paga e você atende no fluxo.",
};

export default function EsmalteriaPage() {
  return (
    <NicheLanding
      content={{
        tipo: "esmalteria",
        theme: "nails",
        hero: {
          src: "/lp/nails-hero.jpg",
          alt: "Manicure finalizando esmaltação",
          objectPosition: "object-[center_35%]",
        },
        photo: {
          src: "/lp/nails1.jpg",
          alt: "Esmaltes organizados na esmalteria",
        },
        headline: (
          <>
            Semana cheia{" "}
            <span className="font-accent niche-lp-accent">
              sem fila na porta.
            </span>
          </>
        ),
        lead: "Muita gente, pouco tempo entre uma e outra. O link enche a agenda sozinho — manicure, pedicure, spa dos pés — sem você virar recepção o dia inteiro.",
        ctaPrimary: "Montar agenda da esmalteria",
        pain: {
          kicker: "O que trava o fluxo",
          title: (
            <>
              Alta rotatividade.{" "}
              <span className="font-accent niche-lp-accent">
                Agenda no improviso.
              </span>
            </>
          ),
          body: "Cliente quer “encaixe agora”. Outra desmarca em cima da hora. Você perde o ritmo da mesa, atrasa a próxima e a fila vira estresse — enquanto horários que podiam estar pagos ficam abertos.",
        },
        money: {
          kicker: "Mais giro, mais caixa",
          title: (
            <>
              O link preenche a semana —{" "}
              <span className="font-accent niche-lp-accent">
                você só atende.
              </span>
            </>
          ),
          body: "Quem quer unha marca e paga no link. A mesa para de furar. Você mantém o ritmo alto sem ficar respondendo “tem horário hoje?” a cada cinco minutos.",
          points: [
            {
              title: "Mesa sempre andando",
              body: "Os slots se enchem sozinhos. Menos buraco entre uma cliente e outra.",
            },
            {
              title: "Menos desmarque",
              body: "Quem garantiu o horário com pagamento aparece no horário.",
            },
            {
              title: "Fila sob controle",
              body: "Encaixe deixa de ser caos — a agenda mostra o que cabe.",
            },
          ],
        },
        flow: {
          kicker: "No ritmo da esmalteria",
          title: (
            <>
              Do story à mesa —{" "}
              <span className="font-accent niche-lp-accent">sem atrito.</span>
            </>
          ),
          steps: [
            {
              title: "Cliente toca no link da bio",
              body: "Vê manicure, pedicure, spa, blindagem — com tempo e preço. Escolhe o dia.",
            },
            {
              title: "Paga e trava o horário",
              body: "Sem “me avisa se liberar”. O compromisso só entra quando o valor confirma.",
            },
            {
              title: "Você segue o fluxo do dia",
              body: "Lembrete vai pra cliente. A mesa não para. Você foca no acabamento.",
            },
          ],
        },
        proof: {
          kicker: "Esmalteria que gira",
          title: (
            <>
              Enquanto outras ainda marcam no zap,{" "}
              <span className="font-accent niche-lp-accent">
                a sua semana já está vendida.
              </span>
            </>
          ),
          body: "Mais atendimentos no mesmo espaço de tempo. Menos stress na recepção. Um fluxo que combina com quem vive de giro alto.",
          cta: "Quero encher minha mesa",
        },
        close: {
          title: (
            <>
              Pronto pra lotar a esmalteria{" "}
              <span className="font-accent niche-lp-accent">
                sem virar fila?
              </span>
            </>
          ),
          body: "Cadastre os serviços, abra os horários e manda o link. Em pouco tempo a agenda começa a se preencher sozinha.",
          cta: "Criar agenda da esmalteria",
        },
      }}
    />
  );
}
