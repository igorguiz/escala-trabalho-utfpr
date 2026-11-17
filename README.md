# PWA — Escala de Trabalho UTFPR 2026 | Beta 0.4

**Versão sem rodízio.** PWA estático para GitHub Pages, sem login, desenvolvido com HTML/CSS/JavaScript. Todos os cinco dias úteis ficam habilitados para escolha de qualquer servidor.

## Regras desta versão

- Cada servidor escolhe os dias habituais de segunda a sexta, podendo acrescentar exceções positivas ou negativas em datas específicas.
- Em cada dia de expediente regular, o sistema procura entre **zero, um ou dois** servidores, nunca mais que dois.
- **Dois:** se ao menos dois estiverem disponíveis e forem de departamentos diferentes, dois serão escolhidos. Quando houver mais de dois candidatos, o algoritmo prioriza diversidade semanal e equilíbrio anual.
- **Um:** quando há somente um disponível, ele trabalha sozinho. O mesmo ocorre quando todos os disponíveis são do mesmo departamento: apenas um é escolhido para evitar conflito.
- **Nenhum:** quando ninguém está disponível, o dia aparece como **Sem servidor**. Não se força uma alocação fictícia.
- **Não existe rodízio** nem a obrigação de completar duas posições por dia; trabalhar sozinho é uma situação regular.
- Feriados, recessos e o período de horário especial do calendário UTFPR 2026 não recebem escala ordinária.

## O que o sistema oferece

- Escala exibida **na própria página** em visões diária, semanal, mensal e anual.
- **PDF** da visualização atual ou de todo o ano, com status de 1, 2 ou 0 servidores.
- Resumo com dias de uma pessoa, duas pessoas, sem ninguém e total anual por servidor.
- Botões **Marcar todos**, **Desmarcar todos**, **Salvar disponibilidade** e **Atualizar**.
- Importação/exportação local das preferências como JSON.
- Instalação PWA e Service Worker com estratégia **rede primeiro**, cache offline e revisão 0.4.0.
- Sincronização **opcional** com Supabase.

## Publicar no GitHub Pages

1. Extraia o ZIP e envie seu **conteúdo**, preservando pastas e nomes, à raiz do repositório `igorguiz/escala-trabalho-utfpr`. O arquivo `index.html` deve estar na raiz; não envie o próprio ZIP como único arquivo.
2. Substitua os arquivos da versão anterior, incluindo `sw.js`, `index.html`, `app.js`, `data.js`, `scheduler.js`, `sync.js`, `pdf.js`, `styles.css` e `manifest.webmanifest`.
3. **Se o seu `config.js` já contiver dados do Supabase, mantenha o arquivo configurado e NÃO substitua suas informações pelo exemplo vazio.**
4. No GitHub, deixe **Settings → Pages → Deploy from a branch → main / (root)**. Aguarde a publicação do commit.
5. Abra `https://igorguiz.github.io/escala-trabalho-utfpr/?v=0.4.0` uma vez para contornar eventual cache da Beta 0.3. A versão 0.4.0 utiliza rede primeiro; acessos seguintes podem ser feitos pela URL normal.

### Atualização dos dados

- **Sem Supabase:** o botão **Atualizar** e o recarregamento da página reabrem os dados salvos **no navegador atual**. Outros computadores não compartilham esses dados.
- **Com Supabase:** os dados vêm da tabela `escala_pessoas_2026` e são consultados novamente ao abrir/atualizar o PWA, ao retornar à aba e periodicamente (enquanto o site estiver ativo). O armazenamento local fornece continuidade em caso de falha da rede.
- Os dados já salvos na Beta 0.3 são **preservados**, tanto em `localStorage` quanto na tabela Supabase. O antigo campo `rotationDay` é desconsiderado.

## Habilitar ou manter o Supabase (opcional)

A versão 0.4 utiliza apenas a tabela `escala_pessoas_2026`. Se você já configurou o Supabase da versão anterior, **não precisa alterar o banco**; a tabela antiga de configuração do rodízio fica sem uso. Se for criar um banco novo, execute `supabase.sql` e defina no `config.js` a URL do projeto e sua chave pública (`anon` / publishable):

```js
window.PWA_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_PUBLICA'
};
```

**Segurança:** não publique uma chave secreta/service_role. A interface é pública e a política SQL de exemplo permite edição anônima; assim, qualquer visitante poderá alterar preferências, e não há rastreabilidade nem aprovação. Não utilize como escala oficial sem um procedimento de revisão dos dados publicados.

## Testes

Em um computador de desenvolvimento com Node.js:

```bash
node tests/test-schedule.mjs
```

Os testes verificam o calendário, o limite de duas pessoas, duplas de departamentos distintos, dias com uma pessoa, ausência de candidatos, conflito de departamento e exceção de disponibilidade. Para executar a página localmente, sirva os arquivos por HTTP (não abra como `file://`, pois navegadores podem bloquear os módulos JavaScript).

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html`, `styles.css` | Interface |
| `app.js` | Edição, filtros e visualização |
| `data.js` | Cadastro inicial e calendário administrativo 2026 |
| `scheduler.js` | Distribuição sem rodízio |
| `pdf.js` | PDF diretamente no navegador |
| `sync.js`, `config.js` | Armazenamento e sincronização opcional |
| `supabase.sql` | Banco opcional para novas instalações |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA e cache |

**Limite:** o calendário incluído atende exclusivamente a 2026. A escala proposta deve passar por conferência administrativa antes de se tornar definitiva.
