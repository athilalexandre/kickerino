import { useState } from "react";
import type { AppSettings } from "../types/settings";
import { MessageSquare, HelpCircle, RefreshCw, CheckCircle2 } from "lucide-react";

interface SupportMessagesDashboardProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

export function SupportMessagesDashboard({ settings, onChange }: SupportMessagesDashboardProps) {
  const [useGlobal, setUseGlobal] = useState(settings.useGlobalHumanMessages);
  const [greeting, setGreeting] = useState(settings.greetingTemplate);
  const [messagesText, setMessagesText] = useState(() =>
    (settings.globalSupportMessages || []).join("\n")
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMessages = messagesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    onChange({
      ...settings,
      useGlobalHumanMessages: useGlobal,
      greetingTemplate: greeting.trim(),
      globalSupportMessages: parsedMessages,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    // Reset to default settings values
    setUseGlobal(true);
    setGreeting("Salve {channel}, bora que bora!");
    setMessagesText([
      "Boa live, {channel}! Passando pra deixar aquele apoio de sempre.",
      "Tamo junto, {channel}! Que a stream de hoje seja leve e divertida.",
      "Só passando pra dar uma moral e desejar uma ótima live!",
      "Boa jogatina, {channel}! Hoje promete render muita resenha.",
      "Não esquece de beber água e dar uma alongada durante a live.",
      "Cheguei pra fortalecer e curtir um pouco a stream com vocês.",
      "Boa sorte nas partidas de hoje, {channel}! Tô na torcida.",
      "Mesmo mais quieto no chat, continuo por aqui apoiando.",
      "Que a live de hoje venha cheia de momentos bons e muita risada.",
      "Passando pra deixar aquele salve e desejar sucesso na stream!",
      "Vai com calma e aproveita a live, {channel}. O importante é se divertir.",
      "Tô curtindo demais o clima da live hoje, tá muito bom!",
      "Mais um dia acompanhando e fortalecendo o seu trabalho.",
      "Espero que a stream renda boas partidas e histórias engraçadas.",
      "Hoje o apoio tá garantido, {channel}! Bora pra cima.",
      "Live boa, chat tranquilo e muita resenha. Tem coisa melhor?",
      "Segue firme, {channel}! Dá pra ver sua evolução a cada live.",
      "Tô por aqui aproveitando o conteúdo e dando aquela força.",
      "Independentemente do resultado do jogo, a diversão já tá garantida.",
      "Que seja mais uma ótima stream, {channel}! Sucesso e boas vibes.",
      "Tamo junto no lurk hoje, {channel}! Força aí.",
      "Só na resenha por aqui, boa live!",
      "Vibe boa demais nessa stream hoje.",
      "Sempre na torcida pelo seu canal, {channel}.",
      "Deixando a live de fundo pra dar aquela força moral.",
      "Gameplay absurda! Segue firme, {channel}.",
      "Chat nota 10, streamer nota 1000. Boa live!",
      "Fortalecendo o lurk de hoje. Bom trabalho, {channel}!",
      "Só passando pra deixar a marca do apoio diário.",
      "O conteúdo tá excelente, {channel}. Bora pra cima!",
      "Acompanhando quietinho aqui, boa stream a todos.",
      "Que o dia de hoje traga ótimos clips e boas risadas.",
      "Sem tempo de interagir muito, mas o apoio tá garantido!",
      "Sempre bom colar aqui na live pra trocar uma ideia ou só assistir.",
      "A evolução das suas lives é nítida, parabéns {channel}!",
      "Gameplay fina e resenha de primeira. Sucesso hoje!",
      "Deixando meu salve e meu lurk diário pra fortalecer.",
      "Stream de qualidade confirmada por aqui. Bora!",
      "Passando de leve pra desejar sucesso na transmissão de hoje.",
      "Tô na correria, mas a aba da live já tá aberta no apoio!",
      "Clima da live tá sensacional hoje, parabéns {channel}.",
      "Apoiando o streamer favorito da galera. Boa live!",
      "Bora pra mais um dia de muito foco e diversão.",
      "De olho na gameplay e torcendo por boas jogadas hoje.",
      "Que stream leve e agradável. Parabéns pelo trampo, {channel}.",
      "Lurk active e energia positiva enviada daqui!",
      "Mais uma live insana começando. Bora curtir!",
      "Streamer brabo demais! Tamo junto nessa caminhada, {channel}.",
      "Passando pra fortalecer os viewers e desejar uma live produtiva.",
      "Só assistindo de leve e curtindo o som. Boa live!",
      "O apoio de sempre tá garantido, {channel}. Sucesso hoje!",
      "Aba aberta, volume mudo e lurk ativo pra ajudar nas métricas.",
      "Bora que a resenha hoje promete. Salve, {channel}!",
      "Aquela passadinha rápida pra dar um up na live.",
      "Seu esforço diário inspira muita gente, {channel}. Força!",
      "Acompanhando mais um dia dessa jornada. Tamo junto!",
      "Deixando aquele apoio sincero para a live de hoje.",
      "Só observando as jogadas ensaiadas. Boa sorte, {channel}!",
      "Clima do chat tá muito massa hoje. Parabéns pela comunidade.",
      "Apoiando o conteúdo que a gente gosta de assistir. Boa live!",
      "A aba já está no esquema pra dar aquela força. Sucesso!",
      "Mais uma stream pra conta. Que dê tudo certo hoje, {channel}.",
      "Deixando o computador ligado no apoio de sempre.",
      "Que os deuses da internet colaborem com a conexão hoje!",
      "Só passando pra dar um salve e deixar a live rodando.",
      "Gameplay diferenciada e resenha inteligente. Boa stream!",
      "Força total nas lives de hoje, {channel}. Tamo junto!",
      "Tô no trabalho mas a aba do apoio tá ativa. Bom trampo!",
      "Sempre com conteúdo de alto nível por aqui. Parabéns!",
      "Que a stream renda momentos inesquecíveis hoje. Sucesso!"
    ].join("\n"));
  };

  const totalLines = messagesText.split("\n").filter((l) => l.trim().length > 0).length;

  return (
    <div className="reciprocity-settings-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="reciprocity-settings-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MessageSquare size={20} style={{ color: "#75e39b" }} />
            Configuração de Frases de Apoio
          </h3>
          <p style={{ marginTop: "4px" }}>
            Configure mensagens humanas e saudações automáticas para serem enviadas aos streamers.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleReset}
            title="Restaurar Frases Padrão"
          >
            <RefreshCw size={15} />
            <span>Restaurar Padrão</span>
          </button>
          
          <button
            type="button"
            className="btn btn--success"
            onClick={handleSave}
            title="Salvar Alterações"
          >
            <CheckCircle2 size={15} />
            <span>{saveSuccess ? "Salvo!" : "Salvar Configurações"}</span>
          </button>
        </div>
      </div>

      <div style={{
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #28343a",
        background: "rgba(17, 20, 23, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "250px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "bold", color: "#f6fafb" }}>
            <input
              type="checkbox"
              checked={useGlobal}
              onChange={(e) => setUseGlobal(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <span>Ativar Frases Humanas Globais</span>
          </label>
          <span style={{ fontSize: "12px", color: "#8fa1a8", marginLeft: "24px" }}>
            Quando ativo, substitui as mensagens individuais do canal por saudações e frases humanas aleatórias globais.
          </span>
        </div>
        {useGlobal && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(117, 227, 155, 0.1)", border: "1px solid rgba(117, 227, 155, 0.2)", padding: "6px 12px", borderRadius: "6px", color: "#75e39b", fontSize: "12px", fontWeight: "bold" }}>
            <span>● Modo Humano Ativo</span>
          </div>
        )}
      </div>

      <div className="settings-panel-grid" style={{ opacity: useGlobal ? 1 : 0.6, transition: "opacity 200ms ease" }}>
        
        {/* Lado Esquerdo: Saudação Inicial e Ajuda */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontWeight: "600", color: "#f6fafb", display: "flex", alignItems: "center", gap: "6px" }}>
              Mensagem de Saudação Inicial
            </label>
            <span style={{ fontSize: "12px", color: "#8fa1a8" }}>
              Enviada automaticamente quando o robô detecta que a live entrou ao vivo pela primeira vez.
            </span>
            <input
              type="text"
              disabled={!useGlobal}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              style={{
                width: "100%",
                height: "38px",
                padding: "0 12px",
                border: "1px solid #2a3338",
                borderRadius: "6px",
                color: "#edf4f6",
                background: "#101417",
                outline: "none"
              }}
            />
          </div>

          <div style={{
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #28343a",
            background: "rgba(17, 20, 23, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <h4 style={{ margin: "0", color: "#f6fafb", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
              <HelpCircle size={16} style={{ color: "#3b82f6" }} />
              Dicas de Placeholders (Tags)
            </h4>
            <p style={{ margin: "0", fontSize: "12px", color: "#8fa1a8", lineHeight: "1.4" }}>
              Você pode usar as seguintes tags dinâmicas nas suas mensagens:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", marginTop: "4px" }}>
              <div>
                <code style={{ background: "#101417", padding: "2px 6px", borderRadius: "4px", color: "#75e39b", marginRight: "8px", fontFamily: "monospace" }}>{"{channel}"}</code>
                <span style={{ color: "#edf4f6" }}>Nome / Username do streamer. (Pode ser usado na Saudação e nas Frases)</span>
              </div>
              <div>
                <code style={{ background: "#101417", padding: "2px 6px", borderRadius: "4px", color: "#75e39b", marginRight: "8px", fontFamily: "monospace" }}>{"{timeOfDay}"}</code>
                <span style={{ color: "#edf4f6" }}>Bom dia, Boa tarde ou Boa noite (automático baseado no horário). (Apenas na Saudação)</span>
              </div>
              <div>
                <code style={{ background: "#101417", padding: "2px 6px", borderRadius: "4px", color: "#75e39b", marginRight: "8px", fontFamily: "monospace" }}>{"{dayOfWeek}"}</code>
                <span style={{ color: "#edf4f6" }}>Dia da semana atual (ex: Segunda, Terça, etc.). (Apenas na Saudação)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Frases Periódicas */}
        <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontWeight: "600", color: "#f6fafb" }}>
              Frases de Apoio Periódicas
            </label>
            <span style={{
              fontSize: "11px",
              background: "#242b30",
              color: "#8fa1a8",
              padding: "2px 8px",
              borderRadius: "12px",
              fontWeight: "bold"
            }}>
              {totalLines} frases cadastradas
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "#8fa1a8" }}>
            Digite suas frases de apoio (uma por linha). O robô selecionará uma frase aleatória para cada live ao vivo.
          </span>
          <textarea
            disabled={!useGlobal}
            rows={12}
            value={messagesText}
            onChange={(e) => setMessagesText(e.target.value)}
            placeholder="Digite suas frases de apoio aqui, uma por linha..."
            style={{
              width: "100%",
              height: "240px",
              padding: "10px 12px",
              border: "1px solid #2a3338",
              borderRadius: "6px",
              color: "#edf4f6",
              background: "#101417",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: "1.5"
            }}
          />
        </div>

      </div>
    </div>
  );
}
