export type ChannelStatus = "live" | "offline" | "unknown" | "error";

export type ChannelSupportConfig = {
  intervalMinutes?: number;      // Intervalo customizado (se undefined, usa o global)
  messages: string[];            // Lista de mensagens rotativas
  nextMessageIndex: number;      // Índice da próxima mensagem a ser enviada
  sendAllAtOnce?: boolean;       // Enviar todas as mensagens de uma vez em um único ciclo
};

export type KickChannel = {
  slug: string;
  username?: string;
  avatarUrl?: string;
  status: ChannelStatus;
  title?: string;
  category?: string;
  viewers?: number;
  chatroomId?: number;
  lastCheckedAt?: number;
  lastWentLiveAt?: number;
  errorMessage?: string;
  supportOffline?: boolean;
  supportEnabled?: boolean;
  supportConfig?: ChannelSupportConfig;
};
