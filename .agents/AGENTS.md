# Kickerino Rules

## Processo de Release / Atualização do Executável

Sempre que o usuário solicitar um novo release ou para gerar um novo executável (exe) de atualização, siga estritamente os seguintes passos sem pular nenhum:

1. **Incrementar a versão** (por exemplo, de `0.9.9-10` para `0.9.9-11`) nos seguintes 3 arquivos do projeto:
   - [package.json](file:///c:/Users/athil/Documents/Projects/Personal/kickerino/package.json) (`"version": "X.Y.Z"`)
   - [src-tauri/Cargo.toml](file:///c:/Users/athil/Documents/Projects/Personal/kickerino/src-tauri/Cargo.toml) (`version = "X.Y.Z"`)
   - [src-tauri/tauri.conf.json](file:///c:/Users/athil/Documents/Projects/Personal/kickerino/src-tauri/tauri.conf.json) (`"version": "X.Y.Z"`)

2. **Commitar e fazer o push** do commit de bump de versão para a branch principal:
   - Adicionar os arquivos: `git add .`
   - Commitar com mensagem descritiva: `git commit -m "bump(version): bump version to X.Y.Z"`
   - Fazer push: `git push` (lembrando de limpar a variável `GITHUB_TOKEN` com `$env:GITHUB_TOKEN=""` no powershell se necessário).

3. **Gerar e pushar a TAG do git** para disparar o workflow no GitHub Actions que gera o `.exe` de produção:
   - Criar tag: `git tag vX.Y.Z`
   - Pushar tag: `git push origin vX.Y.Z`

Sempre siga esse checklist completo para que o executável correto seja gerado via GitHub Actions e o update in-app funcione de forma integrada.
