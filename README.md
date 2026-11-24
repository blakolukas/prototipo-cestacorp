# Gincana Solidária · protótipo navegável

Protótipo clicável das telas da Direção J (Cestacorp · PUCRS). Site estático: sem build, sem backend, dados de exemplo.

- `/` lista todas as telas por fluxo.
- Login: qualquer e-mail válido + senha com 8 caracteres ou mais.
- Nada é salvo: recarregar volta a tela ao estado inicial.

## Rodar local

```bash
npx serve .
```

## Deploy

Importar o repositório na Vercel (Framework Preset: **Other**, sem build command, output = raiz). Cada push na `main` publica de novo.

Gerado a partir do canvas de design; para mudar uma tela, edite no canvas e gere de novo.
