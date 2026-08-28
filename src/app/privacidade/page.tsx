import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { LegalDocument } from "@/components/marketing/LegalDocument";

export const metadata: Metadata = {
  title: "Política de Privacidade — Book Symbius",
  description:
    "Como o Book Symbius coleta, usa e protege dados pessoais de organizações e clientes finais.",
};

const UPDATED = "28 de agosto de 2026";
const CONTACT = "contato@symbius.com.br";

export default function PrivacidadePage() {
  return (
    <MarketingShell>
      <LegalDocument
        eyebrow="Legal"
        title="Política de Privacidade"
        updatedAt={UPDATED}
        intro={
          <>
            <p>
              Esta Política de Privacidade descreve como o <strong>Book Symbius</strong>{" "}
              (&quot;nós&quot;, &quot;plataforma&quot;), produto da Symbius, trata dados
              pessoais quando você utiliza nosso serviço de agendamento online, painel
              administrativo e integrações (incluindo Google Calendar e pagamentos via
              Cakto).
            </p>
            <p>
              Ao usar o Book Symbius, você declara ter lido e compreendido esta política.
              Dúvidas:{" "}
              <a href={`mailto:${CONTACT}`} className="text-foreground underline-offset-2 hover:underline">
                {CONTACT}
              </a>
              .
            </p>
          </>
        }
        sections={[
          {
            title: "1. Quem somos",
            content: (
              <p>
                O Book Symbius é uma plataforma SaaS multi-tenant de agendamento e
                cobrança, operada pela Symbius, acessível em{" "}
                <Link href="/" className="text-foreground underline-offset-2 hover:underline">
                  book.symbius.com.br
                </Link>
                . Organizações cadastradas criam páginas públicas de agendamento; clientes
                finais utilizam essas páginas para marcar horários e, quando aplicável,
                efetuar pagamentos.
              </p>
            ),
          },
          {
            title: "2. Dados que coletamos",
            content: (
              <>
                <p>
                  <strong>Conta da organização:</strong> nome, e-mail, senha (armazenada
                  de forma criptografada), nome da organização e configurações do painel.
                </p>
                <p>
                  <strong>Agendamentos:</strong> nome, e-mail, telefone, CPF (quando
                  solicitado pelo formulário), respostas a campos personalizados, data/hora
                  escolhida e status do agendamento.
                </p>
                <p>
                  <strong>Pagamentos:</strong> informações de transação processadas pela
                  Cakto (valor, método, status). Não armazenamos dados completos de cartão
                  de crédito.
                </p>
                <p>
                  <strong>Google Calendar (opcional):</strong> quando a organização conecta
                  o Google, recebemos tokens OAuth e metadados da conta Google autorizada
                  (como e-mail) para sincronizar eventos e consultar disponibilidade.
                </p>
                <p>
                  <strong>Dados técnicos:</strong> logs de acesso, endereço IP, tipo de
                  navegador e cookies essenciais para autenticação e segurança.
                </p>
              </>
            ),
          },
          {
            title: "3. Como usamos os dados",
            content: (
              <>
                <p>Utilizamos os dados para:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>criar e gerenciar contas e organizações;</li>
                  <li>operar o fluxo de agendamento e confirmações;</li>
                  <li>processar pagamentos via integração com a Cakto;</li>
                  <li>sincronizar eventos com Google Calendar, quando autorizado;</li>
                  <li>enviar comunicações transacionais (confirmações, lembretes);</li>
                  <li>garantir segurança, prevenir fraudes e cumprir obrigações legais.</li>
                </ul>
              </>
            ),
          },
          {
            title: "4. Compartilhamento com terceiros",
            content: (
              <>
                <p>Podemos compartilhar dados apenas quando necessário com:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Google</strong> — autenticação OAuth e API do Google Calendar;
                  </li>
                  <li>
                    <strong>Cakto</strong> — processamento de pagamentos Pix e cartão;
                  </li>
                  <li>
                    <strong>Provedores de infraestrutura</strong> — hospedagem, e-mail e
                    monitoramento, sob contratos de confidencialidade.
                  </li>
                </ul>
                <p>Não vendemos dados pessoais a terceiros.</p>
              </>
            ),
          },
          {
            title: "5. Base legal (LGPD)",
            content: (
              <p>
                Tratamos dados com base na execução de contrato, consentimento (ex.:
                conexão Google Calendar), legítimo interesse (segurança e melhoria do
                serviço) e cumprimento de obrigações legais, conforme a Lei Geral de
                Proteção de Dados (Lei nº 13.709/2018).
              </p>
            ),
          },
          {
            title: "6. Retenção e segurança",
            content: (
              <p>
                Mantemos os dados enquanto a conta estiver ativa ou conforme exigido por
                lei. Aplicamos medidas técnicas e organizacionais razoáveis para proteger
                informações, incluindo criptografia de senhas, HTTPS e controle de acesso
                por organização.
              </p>
            ),
          },
          {
            title: "7. Seus direitos",
            content: (
              <>
                <p>
                  Titulares de dados podem solicitar acesso, correção, exclusão,
                  portabilidade, revogação de consentimento ou informações sobre
                  compartilhamento, conforme a LGPD.
                </p>
                <p>
                  Organizações que utilizam o Book Symbius são responsáveis pelos dados de
                  seus clientes finais coletados nas páginas de agendamento e devem
                  informá-los adequadamente.
                </p>
                <p>
                  Contato para exercer direitos:{" "}
                  <a href={`mailto:${CONTACT}`} className="text-foreground underline-offset-2 hover:underline">
                    {CONTACT}
                  </a>
                  .
                </p>
              </>
            ),
          },
          {
            title: "8. Cookies",
            content: (
              <p>
                Usamos cookies essenciais para sessão e autenticação. Não utilizamos
                cookies de publicidade comportamental na versão atual do produto.
              </p>
            ),
          },
          {
            title: "9. Alterações",
            content: (
              <p>
                Podemos atualizar esta política periodicamente. A data da última revisão
                será indicada no topo desta página. Alterações relevantes poderão ser
                comunicadas por e-mail ou aviso no painel.
              </p>
            ),
          },
        ]}
      />
    </MarketingShell>
  );
}
