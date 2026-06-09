# Kickerino

Cliente desktop leve para acompanhar canais da Kick, abrir lives rapidamente e receber alertas quando streamers entram ao vivo.

## Stack

- Tauri
- React
- TypeScript
- Vite
- Storage local via `localStorage`

## Funcionalidades do MVP

- Adicionar e remover canais pelo slug ou URL da Kick.
- Salvar canais e configuracoes localmente.
- Checar status `LIVE`, `offline` ou `erro`.
- Exibir titulo, categoria e viewers quando a Kick retornar esses dados.
- Abrir `https://kick.com/{slug}` no navegador padrao.
- Detectar transicao `offline -> live`.
- Tocar alerta sonoro e disparar notificacao quando um canal voltar ao vivo.
- Configurar som, notificacoes, intervalo de checagem e duplo clique.

## Desenvolvimento

Instale os pre-requisitos:

- Node.js com npm
- Rust
- Dependencias do Tauri para Windows

Depois rode:

```bash
npm install
npm run dev
```

Para abrir como app desktop durante o desenvolvimento:

```bash
npm run tauri dev
```

Para gerar instalador Windows:

```bash
npm run tauri build
```

## Estrutura

```text
src/
  app/
  components/
  hooks/
  services/
  types/
src-tauri/
  src/
```

A consulta publica da Kick fica isolada no comando Tauri `fetch_kick_channel`, chamado por `src/services/kickApi.ts`. Assim, se a Kick mudar os endpoints internos, a troca fica concentrada nessa camada.
