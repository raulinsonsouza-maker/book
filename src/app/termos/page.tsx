import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { LegalDocument } from "@/components/marketing/LegalDocument";

export const metadata: Metadata = {
  title: "Termos de Serviço — Book Symbius",
  description:
    "Termos de uso da plataforma Book Symbius para empresas e usuários do serviço de agendamento.",
};

const UPDATED = "28 de agosto de 2026";
const CONTACT = "contato@symbius.com.br";

export default function TermosPage() {
  return (
    <MarketingShell>
      <LegalDocument
        eyebrow="Legal"
        title="Termos de Serviço"
        updatedAt={UPDATED}
        intro={
          <>
            <p>
              Estes Termos de Serviço (&quot;Termos&quot;) regem o uso do{" "}
              <strong>Book Symbius</strong>, plataforma de agendamento online operada
              pela Symbius. Ao criar uma conta ou utilizar o serviço, você concorda com
              estes Termos e com nossa{" "}
              <Link href="/privacidade" className="text-foreground underline-offset-2 hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </>
        }
        sections={[
          {
            title: "1. Definições",
            content: (
              <>
                <p>
                  <strong>Empresa:</strong> pessoa jurídica ou física que contrata o
                  serviço e configura páginas de agendamento.
                </p>
                <p>
                  <strong>Cliente final:</strong> pessoa que agenda um serviço pela página
                  pública de uma empresa.
                </p>
                <p>
                  <strong>Plataforma:</strong> o software Book Symbius, incluindo painel
                  administrativo, APIs e páginas públicas de agendamento.
                </p>
              </>
            ),
          },
          {
            title: "2. Objeto do serviço",
            content: (
              <p>
                O Book Symbius disponibiliza ferramentas para criar páginas de agendamento,
                gerenciar serviços e disponibilidade, registrar reservas, integrar
                pagamentos (via Cakto) e, opcionalmente, sincronizar eventos com Google
                Calendar. Funcionalidades podem evoluir ao longo do tempo.
              </p>
            ),
          },
          {
            title: "3. Cadastro e conta",
            content: (
              <>
                <p>
                  Para usar o painel administrativo, é necessário cadastro com informações
                  verdadeiras. Você é responsável por manter a confidencialidade de suas
                  credenciais e por todas as atividades realizadas na conta.
                </p>
                <p>
                  Reservamo-nos o direito de suspender ou encerrar contas que violem estes
                  Termos ou a legislação aplicável.
                </p>
              </>
            ),
          },
          {
            title: "4. Uso aceitável",
            content: (
              <>
                <p>É proibido utilizar a plataforma para:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>atividades ilegais, fraudulentas ou enganosas;</li>
                  <li>coleta de dados sem base legal ou consentimento adequado;</li>
                  <li>distribuição de malware, spam ou conteúdo abusivo;</li>
                  <li>tentativas de acesso não autorizado a sistemas ou dados de terceiros;</li>
                  <li>uso que comprometa a estabilidade ou segurança do serviço.</li>
                </ul>
              </>
            ),
          },
          {
            title: "5. Responsabilidade da empresa",
            content: (
              <>
                <p>
                  A empresa é responsável pelo conteúdo publicado em suas páginas de
                  agendamento, pelos preços praticados, pelo cumprimento de compromissos
                  com clientes finais e pelo tratamento de dados pessoais coletados no
                  funil, incluindo informar seus clientes sobre finalidades e bases legais.
                </p>
                <p>
                  Credenciais de integração (Cakto, Google) configuradas pela empresa
                  são de sua exclusiva responsabilidade.
                </p>
              </>
            ),
          },
          {
            title: "6. Pagamentos",
            content: (
              <p>
                Pagamentos de clientes finais são processados pela Cakto, conforme termos
                e políticas da própria Cakto. O Book Symbius não é instituição financeira
                e não garante aprovação de transações. Taxas e condições comerciais da
                Cakto aplicam-se independentemente destes Termos.
              </p>
            ),
          },
          {
            title: "7. Integrações de terceiros",
            content: (
              <p>
                Integrações com Google Calendar e outros serviços dependem de
                disponibilidade e políticas dos respectivos provedores. Ao autorizar
                integrações, você concede à plataforma permissão para operar conforme os
                escopos solicitados (criação/consulta de eventos e disponibilidade).
              </p>
            ),
          },
          {
            title: "8. Propriedade intelectual",
            content: (
              <p>
                O software, marca, layout e documentação do Book Symbius pertencem à
                Symbius ou a seus licenciadores. É concedida licença limitada, não
                exclusiva e revogável de uso durante a vigência da conta. Conteúdos
                inseridos pela empresa permanecem de sua propriedade.
              </p>
            ),
          },
          {
            title: "9. Disponibilidade e suporte",
            content: (
              <p>
                Empregamos esforços razoáveis para manter o serviço disponível, mas não
                garantimos operação ininterrupta ou livre de erros. Manutenções
                programadas ou incidentes de infraestrutura podem causar indisponibilidade
                temporária.
              </p>
            ),
          },
          {
            title: "10. Limitação de responsabilidade",
            content: (
              <p>
                Na máxima extensão permitida pela lei, a Symbius não se responsabiliza por
                lucros cessantes, perda de dados causada por uso inadequado, falhas de
                terceiros (Cakto, Google, provedores de internet) ou descumprimento de
                obrigações da empresa perante seus clientes finais. A responsabilidade
                total da Symbius, quando aplicável, limita-se ao valor pago pela
                empresa nos últimos 12 meses pelo serviço, quando houver contratação
                paga.
              </p>
            ),
          },
          {
            title: "11. Rescisão",
            content: (
              <p>
                Você pode encerrar sua conta a qualquer momento entrando em contato conosco.
                Podemos encerrar ou suspender o acesso por violação destes Termos ou por
                descontinuação do serviço, com aviso prévio quando razoavelmente possível.
              </p>
            ),
          },
          {
            title: "12. Alterações e contato",
            content: (
              <>
                <p>
                  Podemos alterar estes Termos. A versão vigente estará sempre publicada
                  nesta página. O uso continuado após alterações constitui aceitação.
                </p>
                <p>
                  Dúvidas:{" "}
                  <a href={`mailto:${CONTACT}`} className="text-foreground underline-offset-2 hover:underline">
                    {CONTACT}
                  </a>
                  .
                </p>
              </>
            ),
          },
        ]}
      />
    </MarketingShell>
  );
}
