import type { KickChannel } from "../types/channel";
import type { AppSettings } from "../types/settings";

const CHANNELS_KEY = "kickerino.channels";
const SETTINGS_KEY = "kickerino.settings";

export const defaultSettings: AppSettings = {
  soundEnabled: true,
  notificationsEnabled: true,
  checkIntervalSeconds: 60,
  openLiveOnDoubleClick: true,
  supportBotEnabled: false,
  supportIntervalMinutes: 10,
  supportMessagesText: "crisjuliano:: No apoio\nsche:: much fish, takes love!",
  supportPreferredQuality: "160p",
  supportQualityCheckSeconds: 60,
  useGlobalHumanMessages: true,
  greetingTemplate: "Salve {channel}, bora que bora!",
  globalSupportMessages: [
    "Boa live, {channel}! Passando pra deixar aquele apoio de sempre.",
    "Tamo junto, {channel}! Que a stream de hoje seja leve e divertida.",
    "Só passando pra dar uma moral e desejar uma ótima live para o(a) {channel}!",
    "Boa jogatina, {channel}! Hoje promete render muita resenha.",
    "Não esquece de beber água e dar uma alongada durante a live, {channel}.",
    "Cheguei pra fortalecer e curtir um pouco a stream do(a) {channel}.",
    "Boa sorte nas partidas de hoje, {channel}! Tô na torcida.",
    "Mesmo mais quieto no chat, continuo por aqui apoiando o(a) {channel}.",
    "Que a live de hoje do(a) {channel} venha cheia de momentos bons e muita risada.",
    "Passando pra deixar aquele salve e desejar sucesso na stream, {channel}!",
    "Vai com calma e aproveita a live, {channel}. O importante é se divertir.",
    "Tô curtindo demais o clima da live hoje, {channel}. Tá muito bom!",
    "Mais um dia acompanhando e fortalecendo o seu trabalho, {channel}.",
    "Espero que a stream do(a) {channel} renda boas partidas e histórias engraçadas.",
    "Hoje o apoio tá garantido, {channel}! Bora pra cima.",
    "Live boa, chat tranquilo e muita resenha. Tem coisa melhor, {channel}?",
    "Segue firme, {channel}! Dá pra ver sua evolução a cada live.",
    "Tô por aqui aproveitando o conteúdo do(a) {channel} e dando aquela força.",
    "Independentemente do resultado, a diversão já tá garantida com o(a) {channel}.",
    "Que seja mais uma ótima stream, {channel}! Sucesso e boas vibes.",
    "Tamo junto no lurk hoje, {channel}! Força aí.",
    "Só na resenha por aqui, boa live, {channel}!",
    "Vibe boa demais nessa stream hoje, {channel}.",
    "Sempre na torcida pelo seu canal, {channel}.",
    "Deixando a live de fundo pra dar aquela força moral para o(a) {channel}.",
    "Gameplay absurda! Segue firme, {channel}.",
    "Chat nota 10, streamer nota 1000. Boa live, {channel}!",
    "Fortalecendo o lurk de hoje. Bom trabalho, {channel}!",
    "Só passando pra deixar a marca do apoio diário para o(a) {channel}.",
    "O conteúdo tá excelente, {channel}. Bora pra cima!",
    "Acompanhando quietinho aqui a live do(a) {channel}. Boa stream a todos.",
    "Que o dia de hoje traga ótimos clips e boas risadas para o(a) {channel}.",
    "Sem tempo de interagir muito, mas o apoio ao canal do(a) {channel} tá garantido!",
    "Sempre bom colar aqui na live do(a) {channel} pra trocar uma ideia ou só assistir.",
    "A evolução das suas lives é nítida, parabéns {channel}!",
    "Gameplay fina e resenha de primeira. Sucesso hoje, {channel}!",
    "Deixando meu salve e meu lurk diário pra fortalecer o(a) {channel}.",
    "Stream de qualidade confirmada por aqui com o(a) {channel}. Bora!",
    "Passando de leve pra desejar sucesso na transmissão de hoje, {channel}.",
    "Tô na correria, mas a aba da live do(a) {channel} já tá aberta no apoio!",
    "Clima da live tá sensacional hoje, parabéns {channel}.",
    "Apoiando o streamer favorito da galera. Boa live, {channel}!",
    "Bora pra mais um dia de muito foco e diversão, {channel}.",
    "De olho na gameplay e torcendo por boas jogadas hoje, {channel}.",
    "Que stream leve e agradável. Parabéns pelo trampo, {channel}.",
    "Lurk ativo e energia positiva enviada daqui para o(a) {channel}!",
    "Mais uma live insana começando. Bora curtir, {channel}!",
    "Streamer brabo demais! Tamo junto nessa caminhada, {channel}.",
    "Passando pra fortalecer os viewers e desejar uma live produtiva para o(a) {channel}.",
    "Só assistindo de leve e curtindo o som. Boa live, {channel}!",
    "O apoio de sempre tá garantido, {channel}. Sucesso hoje!",
    "Aba aberta, volume mudo e lurk ativo pra ajudar nas métricas do(a) {channel}.",
    "Bora que a resenha hoje promete. Salve, {channel}!",
    "Aquela passadinha rápida pra dar um up na live do(a) {channel}.",
    "Seu esforço diário inspira muita gente, {channel}. Força!",
    "Acompanhando mais um dia dessa jornada. Tamo junto, {channel}!",
    "Deixando aquele apoio sincero para a live de hoje, {channel}.",
    "Só observando as jogadas ensaiadas. Boa sorte, {channel}!",
    "Clima do chat tá muito massa hoje. Parabéns pela comunidade, {channel}.",
    "Apoiando o conteúdo que a gente gosta de assistir. Boa live, {channel}!",
    "A aba do(a) {channel} já está no esquema pra dar aquela força. Sucesso!",
    "Mais uma stream pra conta. Que dê tudo certo hoje, {channel}.",
    "Deixando o computador ligado no apoio de sempre ao canal do(a) {channel}.",
    "Que os deuses da internet colaborem com a conexão hoje, {channel}!",
    "Só passando pra dar um salve e deixar a live do(a) {channel} rodando.",
    "Gameplay diferenciada e resenha inteligente. Boa stream, {channel}!",
    "Força total nas lives de hoje, {channel}. Tamo junto!",
    "Tô no trabalho mas a aba do apoio ao canal do(a) {channel} tá ativa. Bom trampo!",
    "Sempre com conteúdo de alto nível por aqui, {channel}. Parabéns!",
    "Que a stream do(a) {channel} renda momentos inesquecíveis hoje. Sucesso!"
  ],
};


function getMessagesFromGlobalText(slug: string, text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const specific: string[] = [];
  const general: string[] = [];

  for (const line of lines) {
    const sep = line.indexOf("::");
    if (sep !== -1) {
      const lineSlug = line.slice(0, sep).trim().toLowerCase();
      const msg = line.slice(sep + 2).trim();
      if (lineSlug === slug.toLowerCase() && msg) {
        specific.push(msg);
      }
    } else {
      if (line) {
        general.push(line);
      }
    }
  }

  return specific.length > 0 ? specific : general;
}

function hasSpecificGlobalMessage(slug: string, text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const sep = line.indexOf("::");
    if (sep !== -1) {
      const lineSlug = line.slice(0, sep).trim().toLowerCase();
      if (lineSlug === slug.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}

export function loadChannels(): KickChannel[] {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY);
    if (!raw) {
      return [];
    }

    const settings = loadSettings();
    const channels = JSON.parse(raw) as KickChannel[];
    return channels.map((channel) => {
      const legacySupportOffline = (channel as any).supportOffline;
      const supportEnabled = channel.supportEnabled ?? (legacySupportOffline !== undefined ? legacySupportOffline : false);
      
      let supportConfig = channel.supportConfig;
      if (!supportConfig) {
        const hasSpecific = hasSpecificGlobalMessage(channel.slug, settings.supportMessagesText);
        const globalMsgs = getMessagesFromGlobalText(channel.slug, settings.supportMessagesText);
        
        supportConfig = {
          messages: hasSpecific && globalMsgs.length > 0 ? globalMsgs : ["No apoio"],
          nextMessageIndex: 0,
        };
      }

      return {
        ...channel,
        status: channel.status ?? "unknown",
        supportEnabled,
        supportConfig,
      };
    });
  } catch {
    return [];
  }
}

export function saveChannels(channels: KickChannel[]) {
  localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
