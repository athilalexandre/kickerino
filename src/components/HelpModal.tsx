import { HelpCircle, X, Bot, Settings, Smile, Layers, Users, Clock, UserCheck } from "lucide-react";
import { useState } from "react";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabId = "overview" | "supportBot" | "channelConfig" | "emotes" | "reciprocity" | "timers" | "account";

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  if (!isOpen) return null;

  const tabs = [
    { id: "overview" as TabId, label: "Visão Geral", icon: <Layers size={16} /> },
    { id: "supportBot" as TabId, label: "Robô de Apoio", icon: <Bot size={16} /> },
    { id: "channelConfig" as TabId, label: "Configuração do Canal", icon: <Settings size={16} /> },
    { id: "emotes" as TabId, label: "Dicas & Emotes", icon: <Smile size={16} /> },
    { id: "reciprocity" as TabId, label: "Reciprocidade", icon: <Users size={16} /> },
    { id: "timers" as TabId, label: "Timers Sonoros", icon: <Clock size={16} /> },
    { id: "account" as TabId, label: "Conta Kick", icon: <UserCheck size={16} /> },
  ];

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <header className="help-modal__header">
          <div className="help-modal__title">
            <HelpCircle size={22} className="help-modal__title-icon" />
            <h2>Manual do Kickerino</h2>
          </div>
          <button className="help-modal__close-btn" onClick={onClose} title="Fechar ajuda">
            <X size={20} />
          </button>
        </header>

        <div className="help-modal__content-wrapper">
          <aside className="help-modal__sidebar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`help-modal__tab-btn ${activeTab === tab.id ? "help-modal__tab-btn--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </aside>

          <main className="help-modal__body">
            {activeTab === "overview" && (
              <div className="help-modal__section">
                <h3>Acompanhamento de Lives</h3>
                <p>
                  O <strong>Kickerino</strong> monitora silenciosamente os streamers cadastrados na lista lateral do aplicativo.
                </p>
                <div className="help-modal__card-info">
                  <strong>🏷️ Status das Transmissões:</strong>
                  <ul>
                    <li><span className="status-indicator live">AO VIVO</span> O streamer está transmitindo. Mostra o título da live, categoria e quantidade de viewers.</li>
                    <li><span className="status-indicator offline">offline</span> O streamer não está transmitindo no momento.</li>
                    <li><span className="status-indicator unknown">Aguardando</span> O app está consultando o status do canal na Kick.</li>
                  </ul>
                </div>
                <p>
                  💡 <strong>Duplo Clique:</strong> Dê dois cliques rápidos em cima do card do streamer para abrir a transmissão direto no seu navegador padrão.
                </p>
              </div>
            )}

            {activeTab === "supportBot" && (
              <div className="help-modal__section">
                <h3>Robô de Apoio Automatizado</h3>
                <p>
                  O robô simula a presença de um moderador/espectador no chat, rodando janelas invisíveis e mutadas no backend do Tauri.
                </p>
                <div className="help-modal__card-info warning">
                  <strong>🤖 Lógica Híbrida de Ativação:</strong>
                  <ul>
                    <li>
                      <strong>Botão do Card Verde:</strong> O robô deste canal está ativado <strong>individualmente</strong> e rodará incondicionalmente, mesmo se o botão global estiver desligado.
                    </li>
                    <li>
                      <strong>Botão do Card Cinza:</strong> Segue o estado global do robô. Se o robô global (cabeçalho) for ligado, todos os cards cinzas ativam e enviam mensagens para os canais que estiverem <code>AO VIVO</code> (ou também offline, se a flag "Apoiar offline" estiver ativa).
                    </li>
                  </ul>
                </div>
                <p>
                  ⚡ O ícone do robô global no cabeçalho serve como atalho para ativar ou desativar o robô de todos os cards de uma vez só.
                </p>
              </div>
            )}

            {activeTab === "channelConfig" && (
              <div className="help-modal__section">
                <h3>Configuração Individual por Canal</h3>
                <p>
                  Clique na engrenagem ⚙️ de qualquer card para expandir as opções daquele canal específico.
                </p>
                <ul>
                  <li>
                    <strong>Intervalo do Canal (min):</strong> Defina o tempo de envio de mensagens personalizado apenas para este canal. Se deixar em branco, o campo usará o tempo global configurado.
                  </li>
                  <li>
                    <strong>Enviar todas de uma vez:</strong>
                    <ul>
                      <li>Se <em>desativado</em>: O robô envia apenas a próxima mensagem da lista a cada ciclo do timer, alternando-as circularmente.</li>
                      <li>Se <em>ativado</em>: O robô envia <strong>todas as mensagens</strong> salvas na lista do canal juntas em um único ciclo, com um atraso seguro de <strong>1.5 segundos</strong> entre elas.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Gerenciador de Mensagens:</strong> Adicione mensagens na caixa e remova no botão "X". Não precisa mais digitar <code>canal::</code> ou prefixos!
                  </li>
                </ul>
              </div>
            )}

            {activeTab === "emotes" && (
              <div className="help-modal__section">
                <h3>Manual de Formatação e Emotes</h3>
                <p>
                  Para garantir que seus emotes de chat apareçam como imagens (e não texto puro), siga estas regras fundamentais:
                </p>
                <div className="help-modal__card-info emote-guide">
                  <strong>💡 Como escrever os emotes:</strong>
                  <ul>
                    <li>
                      <strong>Emotes nativos e de canal (Kick):</strong> Digite com dois pontos ao redor (ex: <code>:classic:</code> para o patinho ou <code>:OOOO:</code> para o emote personalizado do canal). O Kickerino consulta a API do canal e traduz automaticamente para o formato visual.
                    </li>
                    <li>
                      <strong>Emotes de extensões (7TV / BTTV):</strong> Escreva o nome exato do emote sem dois pontos.
                      <br /><em>Exemplo:</em> <code>KEKW</code>, <code>catJAM</code>, <code>GIGACHAD</code>
                    </li>
                  </ul>
                </div>
                <div className="help-modal__alert-box">
                  <strong>⚠️ ATENÇÃO - EVITE QUEBRAS DE LINHA:</strong>
                  <p>
                    Escreva sua mensagem inteira em uma <strong>única linha</strong>. O parser de chat da Kick ignora a renderização de emotes se houver quebras de linha (botão Enter) no corpo da mensagem.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "reciprocity" && (
              <div className="help-modal__section">
                <h3>Painel de Reciprocidade</h3>
                <p>
                  O painel de <strong>Reciprocidade</strong> permite monitorar e ranquear os espectadores que mais apoiam o seu canal assistindo às transmissões.
                </p>
                <div className="help-modal__card-info">
                  <strong>🔑 Integração MissXSS:</strong>
                  <ul>
                    <li>Cadastre sua <strong>Chave API da MissXss</strong> nas configurações do painel para obter o watch time (tempo assistido) dos seus espectadores automaticamente.</li>
                    <li><strong>Sincronização:</strong> O aplicativo atualiza os dados em segundo plano periodicamente de acordo com o intervalo definido nas configurações.</li>
                  </ul>
                </div>
                <div className="help-modal__card-info warning">
                  <strong>📊 Classificações e Status:</strong>
                  <ul>
                    <li><span className="status-indicator live" style={{ background: "#42c773", color: "#06250f" }}>Active</span> Espectador ativo que cumpre a meta mínima de watch time definida na semana.</li>
                    <li><span className="status-indicator unknown" style={{ background: "#dcbf68", color: "#1f2112" }}>Dropping</span> Espectador cujo tempo assistido está abaixo da meta e está prestes a ficar inativo.</li>
                    <li><strong>Ocultar do Ranking:</strong> Use o botão "Ocultar" para remover espectadores do ranking. Gerencie a lista de ocultados na aba "Gerenciar Ocultados".</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "timers" && (
              <div className="help-modal__section">
                <h3>Timers Sonoros</h3>
                <p>
                  Crie lembretes sonoros personalizados com alertas no Windows para manter seus compromissos durante as lives.
                </p>
                <div className="help-modal__card-info">
                  <strong>⏰ Modos de Disparo:</strong>
                  <ul>
                    <li><strong>Intervalo Fixo:</strong> Dispara repetidamente a cada X minutos (ex: beber água a cada 15 min).</li>
                    <li><strong>Horário Específico:</strong> Alerta uma vez ao dia no horário exato configurado (HH:MM).</li>
                    <li><strong>Hora Cheia (Hourly):</strong> Alerta no início de cada hora cheia.</li>
                    <li><strong>Minuto da Hora:</strong> Dispara no minuto exato de cada hora (ex: no minuto 50 de todas as horas).</li>
                  </ul>
                </div>
                <div className="help-modal__card-info">
                  <strong>🎵 Som Personalizado Nativo:</strong>
                  <ul>
                    <li><strong>Anexar Som:</strong> Clique para selecionar um arquivo de som direto do seu computador (MP3, WAV, OGG, FLAC). O arquivo permanece no seu PC e o app o executa localmente.</li>
                    <li><strong>Som Padrão:</strong> Se nenhum som for anexado, o Kickerino usará um chime eletrônico sintetizado.</li>
                    <li><strong>Controle de Volume:</strong> Ajuste o volume de cada timer e teste o som a qualquer momento com o botão de Play ▶️.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="help-modal__section">
                <h3>Conexão da Conta Kick</h3>
                <p>
                  Para que o Robô de Apoio envie mensagens nos chats, é necessário conectar a sua conta da Kick.
                </p>
                <div className="help-modal__card-info">
                  <strong>🔗 Gerenciamento de Sessão:</strong>
                  <ul>
                    <li>Clique no ícone de usuário no cabeçalho para gerenciar o login da Kick.</li>
                    <li><strong>Abrir Janela do Kick:</strong> Abre um navegador embutido para fazer login de forma segura diretamente no site oficial da Kick.</li>
                    <li><strong>Status do Login:</strong> O ícone verde ● indica que você está conectado e o robô está pronto. O ícone vermelho indica necessidade de login.</li>
                    <li><strong>Deslogar:</strong> Limpa o cache de cookies da sessão no webview de maneira segura simulando o logout.</li>
                  </ul>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
