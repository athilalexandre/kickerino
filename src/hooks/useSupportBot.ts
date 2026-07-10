import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type { KickChannel } from "../types/channel";
import type { AppSettings } from "../types/settings";

type SupportBotParams = {
  channels: KickChannel[];
  settings: AppSettings;
  setChannels: React.Dispatch<React.SetStateAction<KickChannel[]>>;
  kickUsername: string | null;
};

export type SupportStatus = "pending" | "sending" | "sent" | "failed";

function buildSupportScript(
  channelSlug: string,
  chatroomId: number,
  messages: string[],
  _qualityEnabled: boolean,
  _preferredQuality: string,
  _qualityCheckSeconds: number,
  allChannelSlugs: string[],
  resolvedEmoteMap: Record<string, string>
): string {
  return `
    (function() {
      if (window.self !== window.top) {
        return;
      }
      if (!window.location.href.includes('/popout/')) {
        return;
      }

      const CONFIG = {
        messages: ${JSON.stringify(messages)},
        allChannelSlugs: ${JSON.stringify(allChannelSlugs)},
      };

      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      function getCookie(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
        return null;
      }

      function tauriLog(level, message) {
        const ts = new Date().toLocaleTimeString();
        console.log('[' + level.toUpperCase() + '] ' + message);
        try {
          if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
            window.__TAURI__.core.invoke('log_message', { level, message, timestamp: ts }).catch(() => {});
          } else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.ipc && window.__TAURI_INTERNALS__.ipc.postMessage) {
            window.__TAURI_INTERNALS__.ipc.postMessage({
              cmd: 'log_message',
              level: level,
              message: message,
              timestamp: ts
            });
          }
        } catch (e) {
          console.error('[Kickerino Bot] Falha ao enviar log via IPC:', e);
        }
      }

      async function sendChatMessage() {
        if (!CONFIG.messages || !CONFIG.messages.length) {
          tauriLog('warn', 'Nenhuma mensagem configurada.');
          tauriLog('batch-error', '${channelSlug}::Nenhuma mensagem configurada.');
          return;
        }

        const chatroomId = ${chatroomId};
        tauriLog('info', 'Chatroom ID obtido estaticamente: ' + chatroomId);

        const sessionToken = getCookie('session_token') || '';
        const xsrfToken = getCookie('XSRF-TOKEN') || '';

        if (sessionToken) {
          tauriLog('info', 'Session token obtido com sucesso.');
        } else {
          tauriLog('warn', 'Aviso: Cookie session_token nao encontrado.');
        }

        const requestHeaders = {
          'Content-Type': 'application/json'
        };

        if (sessionToken) {
          requestHeaders['Authorization'] = 'Bearer ' + sessionToken;
        }

        if (xsrfToken) {
          requestHeaders['X-XSRF-Token'] = xsrfToken;
        }

        // ─── Mapeamento de Emotes ───
        const emoteMap = {
          'classic': '5470844',
          'kekw': '18',
          'lul': '19',
          'pog': '21',
          'biblethump': '22',
          'kappa': '24',
          '5head': '3447',
          'ayaya': '3448',
          'babyrage': '3449',
          'batchest': '3450',
          'clink': '3451',
          'copium': '3452',
          'dansgame': '3453',
          'ez': '3454',
          'feelsbadman': '3455',
          'feelsgoodman': '3456',
          'gigachad': '3457',
          ...${JSON.stringify(resolvedEmoteMap)}
        };

        const replaceEmotes = (text) => {
          if (typeof text !== 'string') return text;
          return text.replace(/:([a-zA-Z0-9_-]+):/g, (match, emoteName) => {
            const lowerName = emoteName.toLowerCase();
            if (emoteMap[lowerName]) {
              const emoteId = emoteMap[lowerName];
              return '[emote:' + emoteId + ':' + emoteName + ']';
            }
            return match;
          });
        };

        for (let i = 0; i < CONFIG.messages.length; i++) {
          const rawMessage = CONFIG.messages[i];
          const message = replaceEmotes(rawMessage);
          
          if (message !== rawMessage) {
            tauriLog('info', 'Mensagem traduzida para emotes: ' + message);
          }

          let success = false;
          let attempts = 0;
          let lastError = '';

          while (attempts < 3 && !success) {
            attempts++;
            tauriLog('info', 'Tentando enviar mensagem (' + (i + 1) + '/' + CONFIG.messages.length + '), tentativa ' + attempts + '/3 para ${channelSlug}...');
            try {
              const sendRes = await fetch('/api/v2/messages/send/' + chatroomId, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify({
                  content: message,
                  type: 'message'
                })
              });

              if (sendRes.ok) {
                success = true;
                tauriLog('success', 'Mensagem ' + (i + 1) + ' enviada com sucesso para ${channelSlug} na tentativa ' + attempts);
              } else {
                const errorText = await sendRes.text();
                lastError = 'Erro ' + sendRes.status + ': ' + errorText;
                tauriLog('error', 'Erro na tentativa ' + attempts + ' para ${channelSlug}: ' + lastError);
              }
            } catch (error) {
              lastError = error instanceof Error ? error.message : String(error);
              tauriLog('error', 'Falha na tentativa ' + attempts + ' para ${channelSlug} com excecao: ' + lastError);
            }

            if (!success && attempts < 3) {
              tauriLog('info', 'Aguardando 3 segundos antes de tentar novamente...');
              await sleep(3000);
            }
          }

          if (!success) {
            tauriLog('batch-error', '${channelSlug}::' + (lastError || 'Erro no envio de mensagem'));
            return;
          }

          if (i < CONFIG.messages.length - 1) {
            const msgDelay = Math.floor(Math.random() * 11000) + 20000; // 20s to 30s
            tauriLog('info', 'Aguardando ' + (msgDelay / 1000) + 's antes de enviar a proxima mensagem...');
            await sleep(msgDelay);
          }
        }

        tauriLog('batch-success', '${channelSlug}');
      }

      function muteVideos() {
        try {
          document.querySelectorAll('video, audio').forEach(el => {
            if (!el.muted) {
              el.muted = true;
              el.volume = 0;
            }
          });
        } catch (e) {}
      }

      async function init() {
        tauriLog('info', 'Iniciando automacao no canal ${channelSlug}');
        muteVideos();
        const muteInterval = setInterval(muteVideos, 500);

        await sleep(5000);
        await sendChatMessage();
        clearInterval(muteInterval);
      }

      if (document.readyState === 'complete') {
        init();
      } else {
        window.addEventListener('load', init);
      }
    })();
  `;
}

export function useSupportBot({ channels, settings, setChannels, kickUsername }: SupportBotParams) {
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [intervalRemaining, setIntervalRemaining] = useState<number>(0);
  const [channelSupportStatuses, setChannelSupportStatuses] = useState<Record<string, SupportStatus>>({});
  const [botLogs, setBotLogs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kickerino.bot_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const sentGreetingsRef = useRef<Set<string>>(new Set());
  const usedMessagesInBatchRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<number | null>(null);

  // Sync state refs to prevent stale closures
  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const batchQueueRef = useRef(batchQueue);
  useEffect(() => {
    batchQueueRef.current = batchQueue;
  }, [batchQueue]);

  // Derived active support slugs
  const activeSupportSlugs = channels
    .filter((channel) => channel.status === "live" && channel.supportEnabled === true)
    .map((channel) => channel.slug);

  const addLog = (
    level: "INFO" | "SUCESSO" | "ERRO" | "COOLDOWN" | "INÍCIO" | "FIM",
    message: string
  ) => {
    const ts = new Date().toLocaleTimeString();
    const logLine = `[${ts}] [${level}] ${message}`;
    setBotLogs((prev) => {
      const next = [logLine, ...prev].slice(0, 500);
      localStorage.setItem("kickerino.bot_logs", JSON.stringify(next));
      return next;
    });
    void invoke("log_message", {
      level: level.toLowerCase(),
      message,
      timestamp: ts,
    }).catch(() => {});
  };

  const clearLogs = () => {
    setBotLogs([]);
    localStorage.removeItem("kickerino.bot_logs");
  };

  const handleChannelFinished = (slug: string, success: boolean, error?: string) => {
    if (success) {
      addLog("SUCESSO", `Mensagem enviada com sucesso para ${slug}.`);
      setChannelSupportStatuses((prev) => ({ ...prev, [slug]: "sent" }));
    } else {
      addLog("ERRO", `Falha ao enviar mensagem para ${slug}: ${error || "Erro desconhecido"}`);
      setChannelSupportStatuses((prev) => ({ ...prev, [slug]: "failed" }));
    }

    setCurrentSlug(null);

    // If there are more channels in the queue, start the safety interval
    if (batchQueueRef.current.length > 0) {
      const delay = Math.floor(Math.random() * 11) + 20; // 20 to 30 seconds
      addLog("INFO", `Aguardando intervalo de segurança de ${delay}s antes de prosseguir.`);
      setIntervalRemaining(delay);
    }
  };

  const handleTimeout = (slug: string) => {
    void invoke("close_support_window", { slug }).catch(() => {});
    handleChannelFinished(slug, false, "Timeout de 35s atingido");
  };

  const triggerBatchCycle = async () => {
    // Avoid excess: check if own live is active
    if (kickUsername) {
      try {
        const payload = await invoke<{ isLive: boolean }>("fetch_kick_channel", {
          slug: kickUsername,
        });
        if (payload.isLive) {
          addLog("INFO", `Ciclo suspenso: Sua live (${kickUsername}) está ativa (evitando excesso no chat).`);
          const cdSecs = settingsRef.current.supportIntervalMinutes * 60;
          setCooldownTime(cdSecs);
          addLog("COOLDOWN", `Reiniciando cooldown de ${settingsRef.current.supportIntervalMinutes} minutos.`);
          return;
        }
      } catch (err) {
        console.error("Erro ao verificar status da própria live:", err);
      }
    }

    const liveSupportSlugs = channelsRef.current
      .filter((channel) => channel.status === "live" && channel.supportEnabled === true)
      .map((channel) => channel.slug);

    if (liveSupportSlugs.length === 0) {
      addLog("INFO", "Nenhum canal online detectado para apoio neste ciclo.");
      const cdSecs = settingsRef.current.supportIntervalMinutes * 60;
      setCooldownTime(cdSecs);
      addLog("COOLDOWN", `Reiniciando cooldown de ${settingsRef.current.supportIntervalMinutes} minutos.`);
      return;
    }

    addLog("INÍCIO", `Iniciando ciclo de envios. Canais online selecionados: ${liveSupportSlugs.join(", ")}`);

    // Reset unique messages list for this batch cycle
    usedMessagesInBatchRef.current.clear();

    const initialStatuses: Record<string, SupportStatus> = {};
    for (const slug of liveSupportSlugs) {
      initialStatuses[slug] = "pending";
    }

    setChannelSupportStatuses(initialStatuses);
    setBatchQueue(liveSupportSlugs);
    setIsBatchRunning(true);
  };

  const triggerManualMessage = async (slug: string) => {
    addLog("INFO", `Disparo manual acionado para ${slug}.`);

    if (currentSlug === slug) {
      addLog("INFO", `Canal ${slug} já está sendo processado.`);
      return;
    }

    setChannelSupportStatuses((prev) => ({ ...prev, [slug]: "pending" }));
    setBatchQueue((prev) => {
      const filtered = prev.filter((s) => s !== slug);
      return [slug, ...filtered];
    });

    if (!isBatchRunning) {
      setIsBatchRunning(true);
    }
  };

  // Callback refs to prevent stale closures in events listener
  const handleChannelFinishedRef = useRef(handleChannelFinished);
  useEffect(() => {
    handleChannelFinishedRef.current = handleChannelFinished;
  });

  // Listen to window close events from Rust
  useEffect(() => {
    let active = true;

    const unlistenPromise = listen<string>("support-window-closed", (event) => {
      if (!active) return;
      const closedLabel = event.payload;
      if (closedLabel === "support-worker") {
        setCurrentSlug((current) => {
          if (current) {
            addLog("ERRO", `Janela fechada inesperadamente durante processamento de ${current}.`);
            // Run finished logic inside timeout to let state settle
            setTimeout(() => {
              handleChannelFinishedRef.current(current, false, "Janela fechada pelo sistema ou usuário");
            }, 0);
          }
          return null;
        });
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    });

    return () => {
      active = false;
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Listen to support bot log events from Rust
  useEffect(() => {
    let active = true;

    const unlistenPromise = listen<any>("support-log", (event) => {
      if (!active) return;
      const { level, message, timestamp } = event.payload;

      if (level === "batch-success") {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        handleChannelFinishedRef.current(message, true);
      } else if (level === "batch-error") {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        const index = message.indexOf("::");
        if (index !== -1) {
          const slug = message.slice(0, index);
          const err = message.slice(index + 2);
          handleChannelFinishedRef.current(slug, false, err);
        } else {
          handleChannelFinishedRef.current(message, false, "Erro desconhecido");
        }
      } else {
        const prefix = `[Robô de Apoio - ${timestamp}]`;
        if (level === "error") {
          console.error(prefix, message);
        } else if (level === "warn") {
          console.warn(prefix, message);
        } else if (level === "success") {
          console.log(`%c${prefix} %c${message}`, "color: #4caf50; font-weight: bold;", "color: inherit;");
        } else {
          console.log(prefix, message);
        }
      }
    });

    return () => {
      active = false;
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Sync active support slugs greetings
  useEffect(() => {
    const currentGreetings = sentGreetingsRef.current;
    for (const slug of Array.from(currentGreetings)) {
      if (!activeSupportSlugs.includes(slug)) {
        currentGreetings.delete(slug);
      }
    }
  }, [JSON.stringify(activeSupportSlugs)]);

  // Safety interval countdown loop
  useEffect(() => {
    if (intervalRemaining <= 0) return;
    const t = setTimeout(() => {
      setIntervalRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [intervalRemaining]);

  // Queue processing logic
  useEffect(() => {
    if (!isBatchRunning || currentSlug !== null || batchQueue.length === 0 || intervalRemaining > 0) {
      return;
    }

    const nextSlug = batchQueue[0];
    setBatchQueue((prev) => prev.slice(1));
    setCurrentSlug(nextSlug);

    const runWorker = async () => {
      const channel = channelsRef.current.find((c) => c.slug === nextSlug);
      if (!channel || channel.status !== "live") {
        addLog("INFO", `Ignorando ${nextSlug} pois não está online.`);
        setChannelSupportStatuses((prev) => ({ ...prev, [nextSlug]: "failed" }));
        setCurrentSlug(null);
        return;
      }

      if (channel.supportEnabled !== true) {
        addLog("INFO", `Ignorando ${nextSlug} pois o apoio individual não está ativado.`);
        setChannelSupportStatuses((prev) => ({ ...prev, [nextSlug]: "failed" }));
        setCurrentSlug(null);
        return;
      }

      addLog("INFO", `Iniciando envio para ${nextSlug}...`);
      setChannelSupportStatuses((prev) => ({ ...prev, [nextSlug]: "sending" }));

      let chatroomId = channel.chatroomId;
      if (!chatroomId) {
        try {
          const payload = await invoke<{ chatroomId?: number }>("fetch_kick_channel", {
            slug: nextSlug,
          });
          chatroomId = payload.chatroomId;
        } catch (err) {
          addLog("ERRO", `Erro ao obter chatroomId para ${nextSlug}.`);
        }
      }

      if (!chatroomId) {
        addLog("ERRO", `Chatroom ID ausente para ${nextSlug}. abortando.`);
        handleChannelFinished(nextSlug, false, "Chatroom ID ausente");
        return;
      }

      let messagesToSend: string[] = [];
      if (settingsRef.current.useGlobalHumanMessages) {
        const hasSentGreeting = sentGreetingsRef.current.has(nextSlug);
        const greetingTpl = settingsRef.current.greetingTemplate || "Salve {channel}, bora que bora!";
        const humanMsgs = settingsRef.current.globalSupportMessages && settingsRef.current.globalSupportMessages.length > 0
          ? settingsRef.current.globalSupportMessages
          : ["No apoio!"];
        const displayCh = channel.username || nextSlug;

        if (!hasSentGreeting) {
          const h = new Date().getHours();
          const timeOfDay = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
          const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
          let greeting = greetingTpl
            .replace(/{timeOfDay}/g, timeOfDay)
            .replace(/{channel}/g, displayCh)
            .replace(/{dayOfWeek}/g, days[new Date().getDay()]);
          
          // Force channel name inclusion
          if (!greeting.includes(displayCh)) {
            greeting = greeting + " (" + displayCh + ")";
          }
          messagesToSend = [greeting];
          sentGreetingsRef.current.add(nextSlug);
        } else {
          // Select a unique message for this cycle
          const unusedMsgs = humanMsgs.filter((msg) => !usedMessagesInBatchRef.current.has(msg));
          const listToPick = unusedMsgs.length > 0 ? unusedMsgs : humanMsgs;
          
          if (unusedMsgs.length === 0) {
            usedMessagesInBatchRef.current.clear();
          }

          let randomRaw = listToPick[Math.floor(Math.random() * listToPick.length)];
          usedMessagesInBatchRef.current.add(randomRaw);

          // Force channel name inclusion
          if (!randomRaw.includes("{channel}")) {
            randomRaw = randomRaw + ", {channel}!";
          }

          const randomMsg = randomRaw.replace(/{channel}/g, displayCh);
          messagesToSend = [randomMsg];
        }
      } else {
        const supportConfig = channel.supportConfig || { messages: [], nextMessageIndex: 0 };
        const rawMessages = supportConfig.messages && supportConfig.messages.length > 0
          ? supportConfig.messages
          : ["No apoio"];

        if (supportConfig.sendAllAtOnce) {
          messagesToSend = [...rawMessages];
        } else if (supportConfig.rotateMessages) {
          const nextIdx = supportConfig.nextMessageIndex || 0;
          messagesToSend = [rawMessages[nextIdx % rawMessages.length]];
          const nextNextIdx = (nextIdx + 1) % rawMessages.length;
          setChannels((prev) =>
            prev.map((c) =>
              c.slug === nextSlug
                ? {
                    ...c,
                    supportConfig: c.supportConfig
                      ? { ...c.supportConfig, nextMessageIndex: nextNextIdx }
                      : { messages: [], nextMessageIndex: nextNextIdx },
                  }
                : c
            )
          );
        } else {
          messagesToSend = [rawMessages[0]];
        }
      }

      const allSlugs = channelsRef.current.map((c) => c.slug);
      let resolvedEmoteMap: Record<string, string> = {};
      try {
        resolvedEmoteMap = await invoke<Record<string, string>>("fetch_channels_emotes", {
          slugs: allSlugs,
        });
      } catch (err) {
        console.error("Falha ao obter emotes:", err);
      }

      const js_script = buildSupportScript(
        nextSlug,
        chatroomId,
        messagesToSend,
        true,
        settingsRef.current.supportPreferredQuality,
        settingsRef.current.supportQualityCheckSeconds,
        allSlugs,
        resolvedEmoteMap
      );

      try {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null;
          handleTimeout(nextSlug);
        }, 35000);

        await invoke("open_support_window", { slug: nextSlug, jsScript: js_script });
      } catch (err) {
        addLog("ERRO", `Falha ao abrir webview para ${nextSlug}: ${err}`);
        handleChannelFinished(nextSlug, false, String(err));
      }
    };

    void runWorker();
  }, [isBatchRunning, currentSlug, batchQueue, intervalRemaining]);

  // Batch completion observer
  useEffect(() => {
    if (isBatchRunning && currentSlug === null && batchQueue.length === 0 && intervalRemaining <= 0) {
      setIsBatchRunning(false);
      addLog("FIM", "Ciclo de envios finalizado para os canais online.");
      const cdSecs = settingsRef.current.supportIntervalMinutes * 60;
      setCooldownTime(cdSecs);
      addLog("COOLDOWN", `Entrando em cooldown de ${settingsRef.current.supportIntervalMinutes} minutos.`);
    }
  }, [isBatchRunning, currentSlug, batchQueue.length, intervalRemaining]);

  // Cooldown countdown loop
  useEffect(() => {
    if (!settings.supportBotEnabled) {
      setCooldownTime(0);
      return;
    }

    if (cooldownTime <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void triggerBatchCycle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownTime, settings.supportBotEnabled]);

  // Global bot enabled/disabled observer
  useEffect(() => {
    if (settings.supportBotEnabled) {
      addLog("INFO", "Iniciando robô geral...");
      void triggerBatchCycle();
    } else {
      setIsBatchRunning(false);
      setBatchQueue([]);
      setCurrentSlug(null);
      setCooldownTime(0);
      setIntervalRemaining(0);
      setChannelSupportStatuses({});
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      void invoke("close_all_support_windows").catch(() => {});
    }
  }, [settings.supportBotEnabled]);

  return {
    isBatchRunning,
    currentSlug,
    cooldownTime,
    intervalRemaining,
    channelSupportStatuses,
    botLogs,
    clearLogs,
    activeSupportSlugs,
    triggerManualMessage,
  };
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 5 && seconds > 0) {
    return "inic.";
  }
  if (seconds === 0) {
    return "enviando";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
