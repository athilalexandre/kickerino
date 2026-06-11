# Kickerino

Cliente desktop leve construído com **Tauri**, **React** e **TypeScript** projetado para streamers e moderadores acompanharem canais da Kick em tempo real, abrirem transmissões rapidamente e automatizarem o envio de mensagens de apoio.

---

## 🌟 Funcionalidades

### 1. Monitoramento em Tempo Real
* Acompanhe o status dos seus canais favoritos da Kick (`AO VIVO`, `Offline`, `Aguardando` ou `Erro`).
* Receba dados atualizados de **categoria/título da transmissão** e **número de espectadores (viewers)** instantaneamente.
* **Alertas Inteligentes:** Notificações sonoras e visuais integradas ao sistema operacional quando um canal entra ao vivo.
* **Atalhos Rápidos:** Duplo clique no card do canal abre a transmissão diretamente no seu navegador padrão.

### 2. Robô de Apoio Automatizado (Automated Support Bot)
O robô de apoio é uma ferramenta de automação avançada que simula a presença de um espectador no chat, abrindo subjanelas WebView2 otimizadas e silenciadas em segundo plano para o chat da Kick.
* **Lógica Híbrida de Ativação:**
  * **Global:** Ative ou desative o robô em todos os canais simultaneamente no cabeçalho.
  * **Individual (Card):** Ative de forma independente o robô para canais específicos clicando no ícone do robô (`Bot`) no card do canal. Se o card estiver verde, o robô rodará de forma incondicional, inclusive se o interruptor global estiver desligado.
* **Suporte a Canais Offline:** Configuração opcional no painel de configurações gerais para manter o apoio ativo mesmo quando o canal estiver offline.

### 3. Configurações Individuais por Canal
Clique no ícone de engrenagem (`Settings`) de qualquer card para gerenciar suas configurações de forma visual e independente:
* **Tempo Personalizado:** Defina um intervalo de tempo em minutos específico para cada canal. Se o campo for deixado em branco, o robô herdará automaticamente o intervalo de tempo global do app.
* **Mensagens Rotativas (Ciclo Circular):** Adicione múltiplas mensagens na lista do canal. O robô enviará uma mensagem de cada vez, na ordem em que foram salvas, alternando-as ciclicamente a cada disparo de tempo.
* **Envio Agrupado em Lote (`sendAllAtOnce`):** Ative a opção "Enviar todas de uma vez" para fazer o robô enviar todas as mensagens salvas na gaveta em um único ciclo do timer. O app utiliza um delay inteligente de **1.5 segundos (1500ms)** entre os disparos para evitar que o chat da Kick filtre a mensagem como spam.

---

## 💬 Guia de Formatação e Emotes
Para garantir que suas mensagens e emotes sejam renderizados corretamente e sem erros no chat da Kick, siga as seguintes orientações:

| **Emotes Nativos/de Canal (Kick)** | Devem ser digitados com dois pontos (ex: `:classic:` para o patinho ou `:OOOO:` para emotes do canal). O Kickerino consulta a API do canal e traduz automaticamente para o formato nativo. | `:classic:` ou `:OOOO:` | Renderizado como imagem no chat da Kick. |
| **Emotes do 7TV** | Devem ser digitados em texto simples, **sem dois pontos**. | `KEKW` ou `catJAM` | Visualizado no navegador de usuários que possuem a extensão do 7TV instalada. |

> [!WARNING]
> **Proibição de Quebras de Linha (`\n`):**
> Nunca aperte a tecla `Enter` ou insira quebras de linha dentro do texto da mensagem. O parser do chat da Kick interpreta quebras de linha como mensagens consecutivas incompletas e não renderiza os emotes visuais, exibindo-os como texto puro. Mantenha toda a frase em uma única linha separada por espaços comuns.

---

## 🚀 Desenvolvimento e Instalação

### Pré-requisitos
* **Node.js** (v18 ou superior) + npm
* **Rust** (compilador Rustc e Cargo)
* Dependências do Tauri configuradas para o Windows (C++ Build Tools).

### Instalação das dependências:
```bash
npm install
```

### Rodar em modo de desenvolvimento (Web + Tauri):
```bash
npm run tauri dev
```

### Gerar instalador Windows de produção (`.exe` e `.msi`):
```bash
npm run tauri:build
```

---

## 📂 Arquitetura do Projeto

```text
├── src/                    # Camada do Frontend (React)
│   ├── app/                # Estrutura e layout principal (App.tsx)
│   ├── components/         # Componentes UI (Cards, Listas, Modais, Ajuda)
│   ├── hooks/              # Custom Hooks React (useLiveMonitor, useSupportBot, useChannels)
│   ├── services/           # Serviços de Storage Local, Integrações API e Updates
│   ├── types/              # Definições de Tipos TypeScript (channel, settings)
│   └── styles.css          # Estilização completa do Kickerino
└── src-tauri/              # Camada do Backend Nativo (Rust)
    ├── src/
    │   ├── lib.rs          # Inicialização, janelas WebView2 em segundo plano e IPC
    │   └── main.rs         # Ponto de entrada nativo do Windows
    └── tauri.conf.json     # Configuração de capacidades, permissões e empacotamento
```
