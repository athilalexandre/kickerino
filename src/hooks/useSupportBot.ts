import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type { KickChannel } from "../types/channel";
import type { AppSettings } from "../types/settings";

type QueueItem = {
  slug: string;
  isManual: boolean;
};

type SupportBotParams = {
  channels: KickChannel[];
  settings: AppSettings;
};

function getMessagesForChannel(slug: string, text: string): string[] {
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

function buildSupportScript(
  channelSlug: string,
  chatroomId: number,
  messages: string[],
  _qualityEnabled: boolean,
  _preferredQuality: string,
  _qualityCheckSeconds: number
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
          return;
        }

        const message = CONFIG.messages[Math.floor(Math.random() * CONFIG.messages.length)];
        tauriLog('info', 'Tentando enviar mensagem para ${channelSlug}: ' + message);

        try {
          // --- INFO DE DEPURAÇÃO ---
          tauriLog('info', 'Document Cookie: ' + document.cookie);
          const metas = Array.from(document.querySelectorAll('meta')).map(m => (m.name || m.getAttribute('property') || '') + '=' + m.content).join(', ');
          tauriLog('info', 'Metas: ' + metas);
          const globals = [];
          for (const key in window) {
            if (key.toLowerCase().includes('csrf') || key.toLowerCase().includes('xsrf') || key.toLowerCase().includes('token')) {
              globals.push(key + '=' + String(window[key]).slice(0, 100));
            }
          }
          tauriLog('info', 'Globals: ' + globals.join(', '));
          const nextDataEl = document.getElementById('__NEXT_DATA__');
          if (nextDataEl) {
            tauriLog('info', 'NEXT_DATA encontrado. Analisando props...');
            try {
              const nd = JSON.parse(nextDataEl.textContent || '{}');
              tauriLog('info', 'NEXT_DATA props keys: ' + Object.keys(nd.props?.pageProps || {}).join(', '));
            } catch (e) {}
          }
          // --------------------------

          // 1. Obter o chatroom ID do canal (injetado estaticamente)
          const chatroomId = ${chatroomId};
          tauriLog('info', 'Chatroom ID obtido estaticamente: ' + chatroomId);

          // 2. Extrair tokens de autenticação
          const sessionToken = getCookie('session_token') || '';
          const xsrfToken = getCookie('XSRF-TOKEN') || '';

          if (sessionToken) {
            tauriLog('info', 'Session token obtido com sucesso.');
          } else {
            tauriLog('warn', 'Aviso: Cookie session_token nao encontrado.');
          }

          const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + sessionToken
          };

          if (xsrfToken) {
            requestHeaders['X-XSRF-Token'] = xsrfToken;
          }

          // 3. Enviar a mensagem
          tauriLog('info', 'Disparando POST para enviar mensagem...');
          const sendRes = await fetch('https://kick.com/api/v2/messages/send/' + chatroomId, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify({
              content: message,
              type: 'message'
            })
          });

          if (sendRes.ok) {
            tauriLog('success', 'Mensagem enviada com sucesso via API para ${channelSlug}');
          } else {
            const errorText = await sendRes.text();
            throw new Error('Erro ao enviar mensagem: ' + sendRes.status + ' - ' + errorText);
          }
        } catch (error) {
          tauriLog('error', 'Falha no envio da mensagem: ' + (error instanceof Error ? error.message : String(error)));
        }
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

        // Aguarda a pagina carregar e estabilizar os cookies de sessao
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

export function useSupportBot({ channels, settings }: SupportBotParams) {
  const [sendQueue, setSendQueue] = useState<QueueItem[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [supportTimers, setSupportTimers] = useState<Record<string, number>>({});
  const timeoutRef = useRef<number | null>(null);
  const processingRef = useRef<string | null>(null);

  // Redefine activeSupportSlugs: channels that should be supported (individual support or global support enabled)
  const activeSupportSlugs = channels
    .filter((channel) => {
      // Se o apoio individual estiver explicitamente desativado, nunca apóia
      if (channel.supportEnabled === false) {
        return false;
      }

      // Se o apoio individual estiver explicitamente ativado no card, apoia sempre (ignorando status)
      if (channel.supportEnabled === true) {
        return true;
      }

      // Se o robô global estiver ativado e o canal estiver no estado padrão (undefined)
      if (settings.supportBotEnabled) {
        if (channel.status === "live") {
          return true;
        }
        if (channel.status === "offline") {
          return settings.supportOfflineChannels;
        }
      }
      return false;
    })
    .map((channel) => channel.slug);

  const activeSlugsSerialized = activeSupportSlugs.join(",");

  // Listen to window close events from Rust
  useEffect(() => {
    let active = true;

    const unlistenPromise = listen<string>("support-window-closed", (event) => {
      if (!active) return;
      const closedLabel = event.payload;
      if (closedLabel === "support-worker") {
        setIsSending(false);
        processingRef.current = null;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current as any);
          timeoutRef.current = null;
        }
      }
    });

    return () => {
      active = false;
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Listen to support bot log events from Rust and forward to main console
  useEffect(() => {
    let active = true;

    const unlistenPromise = listen<any>("support-log", (event) => {
      if (!active) return;
      const { level, message, timestamp } = event.payload;
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
    });

    return () => {
      active = false;
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Sync queue with active support slugs (remove inactive automatic items)
  useEffect(() => {
    setSendQueue((current) =>
      current.filter((item) => item.isManual || activeSupportSlugs.includes(item.slug))
    );
  }, [activeSlugsSerialized]);

  // Close windows if no channels are active and we are not sending manually
  useEffect(() => {
    if (activeSupportSlugs.length === 0 && (!isSending || !processingRef.current)) {
      setSendQueue([]);
      setIsSending(false);
      processingRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as any);
        timeoutRef.current = null;
      }
      void invoke("close_all_support_windows").catch(() => {});
    }
  }, [activeSupportSlugs.length, isSending]);

  // Queue worker effect
  useEffect(() => {
    if (isSending || processingRef.current || sendQueue.length === 0) {
      return;
    }

    const nextItem = sendQueue[0];
    const nextSlug = nextItem.slug;
    const isManual = nextItem.isManual;

    // Verify channel exists in our list and is eligible to send
    const channel = channels.find((c) => c.slug === nextSlug);
    if (!channel) {
      setSendQueue((q) => q.slice(1));
      return;
    }

    if (!isManual) {
      // Se o apoio individual estiver explicitamente desativado, descarta
      if (channel.supportEnabled === false) {
        setSendQueue((q) => q.slice(1));
        return;
      }

      // Se o apoio individual estiver explicitamente ativado (verde no card), aceita o envio incondicionalmente
      const isIndividuallySupported = channel.supportEnabled === true;

      // Se estiver no estado padrão (undefined) e o robô global estiver ligado, valida as regras de status
      const isGloballySupported =
        settings.supportBotEnabled &&
        (channel.status === "live" ||
          (channel.status === "offline" && settings.supportOfflineChannels));

      if (!isIndividuallySupported && !isGloballySupported) {
        setSendQueue((q) => q.slice(1));
        return;
      }
    }

    // Dequeue and mark as sending (using processingRef for immediate synchronous guard)
    processingRef.current = nextSlug;
    setIsSending(true);
    setSendQueue((q) => q.slice(1));

    const runWorker = async () => {
      let chatroomId = channel.chatroomId;

      if (!chatroomId) {
        console.log(`[useSupportBot] Chatroom ID ausente para ${nextSlug}. Buscando via API Rust...`);
        try {
          const payload = await invoke<{ chatroomId?: number }>("fetch_kick_channel", {
            slug: nextSlug,
          });
          chatroomId = payload.chatroomId;
        } catch (err) {
          console.error(`[useSupportBot] Erro ao obter Chatroom ID para ${nextSlug}:`, err);
        }
      }

      if (!chatroomId) {
        console.error(`[useSupportBot] Nao foi possivel obter o Chatroom ID para ${nextSlug}. Abortando envio.`);
        processingRef.current = null;
        setIsSending(false);
        return;
      }

      const messages = getMessagesForChannel(nextSlug, settings.supportMessagesText);
      const js_script = buildSupportScript(
        nextSlug,
        chatroomId,
        messages,
        true, // Always enforce quality
        settings.supportPreferredQuality,
        settings.supportQualityCheckSeconds
      );

      console.log(`[useSupportBot] Iniciando envio de mensagem para ${nextSlug} com chatroomId ${chatroomId}`);

      try {
        await invoke("open_support_window", { slug: nextSlug, jsScript: js_script });
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current as any);
        }
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          invoke("close_support_window", { slug: nextSlug })
            .catch((err) => console.error(`[Kickerino] Erro ao fechar janela para ${nextSlug}:`, err))
            .finally(() => {
              processingRef.current = null;
              setIsSending(false);
            });
        }, 20000) as any;
      } catch (err) {
        console.error(`[Kickerino] Falha ao abrir janela para ${nextSlug}:`, err);
        processingRef.current = null;
        setIsSending(false);
      }
    };

    void runWorker();
  }, [
    sendQueue,
    isSending,
    channels,
    activeSupportSlugs.length,
    settings.supportMessagesText,
    settings.supportPreferredQuality,
    settings.supportQualityCheckSeconds,
    settings.supportOfflineChannels,
  ]);

  // Countdown timer loop
  useEffect(() => {
    const slugs = activeSlugsSerialized ? activeSlugsSerialized.split(",") : [];
    if (slugs.length === 0) {
      setSupportTimers({});
      return;
    }

    // Update keys in timers record based on active support slugs
    setSupportTimers((prev) => {
      const next = { ...prev };
      let changed = false;

      // Add timer for new slugs
      for (const slug of slugs) {
        if (next[slug] === undefined) {
          next[slug] = 5; // 5s startup delay
          changed = true;
        }
      }

      // Remove timers for inactive slugs
      for (const slug of Object.keys(next)) {
        if (!slugs.includes(slug)) {
          delete next[slug];
          changed = true;
        }
      }

      return changed ? next : prev;
    });

    const interval = setInterval(() => {
      setSupportTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        const slugsToQueue: string[] = [];

        for (const slug of Object.keys(next)) {
          const maxSecs = settings.supportIntervalMinutes * 60;

          // Clamp timer value if it exceeds the new limit (e.g. settings changed)
          if (next[slug] > maxSecs && next[slug] > 5) {
            next[slug] = maxSecs;
            changed = true;
          }

          if (next[slug] > 0) {
            next[slug] = next[slug] - 1;
            changed = true;
            if (next[slug] === 0) {
              slugsToQueue.push(slug);
            }
          } else {
            next[slug] = maxSecs;
            changed = true;
          }
        }

        if (slugsToQueue.length > 0) {
          setTimeout(() => {
            setSendQueue((q) => {
              const nextQ = [...q];
              for (const s of slugsToQueue) {
                if (!nextQ.some((item) => item.slug === s)) {
                  nextQ.push({ slug: s, isManual: false });
                }
              }
              return nextQ;
            });
          }, 0);
        }

        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSlugsSerialized, settings.supportIntervalMinutes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as any);
      }
      void invoke("close_all_support_windows").catch(() => {});
    };
  }, []);

  const triggerManualMessage = async (slug: string) => {
    // Reset the timer for this slug in React back to the interval
    setSupportTimers((prev) => {
      if (prev[slug] !== undefined) {
        return {
          ...prev,
          [slug]: settings.supportIntervalMinutes * 60,
        };
      }
      return prev;
    });

    // Add to the front of sendQueue so it sends next with isManual = true
    setSendQueue((q) => {
      const filtered = q.filter((item) => item.slug !== slug);
      return [{ slug, isManual: true }, ...filtered];
    });
  };

  return {
    activeSupportSlugs,
    supportTimers,
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
