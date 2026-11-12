# Escala de Trabalho UTFPR — PWA Beta 0.2

PWA estático pronto para GitHub Pages, com escala anual de 2026, visualização por dia/semana/mês/ano e geração de PDF diretamente no navegador. Sem login, sem Python, sem Node no computador do usuário e sem serviços de geração de PDF.

## O que está implementado

- Calendário administrativo UTFPR 2026 transcrito da imagem fornecida, incluindo feriados, recessos e horário especial de 21 a 31/12 (fora da escala ordinária).
- Oito servidores e respectivos departamentos. Dias previamente cadastrados são apenas sugestões iniciais, livremente editáveis.
- Escolha do dia de rodízio entre segunda e sexta; terça-feira é a configuração inicial.
- **Todos os cinco dias úteis estão liberados para todos os servidores**, sem bloqueio especial para Igor, Vanessa ou Letícia.
- Dois servidores de departamentos diferentes por dia, sempre que as disponibilidades permitem.
- Priorização de ao menos uma participação semanal por pessoa quando viável; distribuição de dias adicionais e rodízios ponderada pelos totais do ano.
- Exceções individuais por data: **indisponível** ou **disponível**. A exceção específica sempre prevalece sobre a seleção semanal.
- Todos os servidores podem ser selecionados no dia do rodízio, desde que marquem esse dia ou cadastrem exceção de disponibilidade. Não há regras fixas pessoais de dias.
- Alertas quando faltarem servidores ou a disponibilidade impedir distribuição semanal ideal.
- Visão diária, semanal, mensal ou anual com tabela e relatórios de comparecimentos.
- Botão para **baixar PDF** da visão escolhida, sem dependência externa.
- Instalação como PWA e cache offline (após primeira visita HTTPS e instalação do Service Worker).
- Exportação/importação de arquivo JSON como backup das escolhas em modo local.
- Sincronização **opcional** com Supabase para que os servidores consultem / alterem os dados de vários computadores.

## 1. Publicar no GitHub Pages (modo local)

1. Crie um repositório no GitHub, por exemplo `escala-trabalho-utfpr`.
2. Envie **o conteúdo desta pasta**, com `index.html` na raiz do repositório. Não é necessário executar build.
3. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/(root)` e salve.
4. Abra `https://SEU-USUARIO.github.io/escala-trabalho-utfpr/`.
5. O site funcionará sem login. No modo inicial **Dados neste navegador**, as escolhas ficam salvas apenas no navegador atual (localStorage). Pessoas em computadores diferentes **não compartilham** automaticamente essas escolhas.

O GitHub Pages não possui banco de dados para preferências mutáveis. Por isso o modo inicial é local, e a sincronização precisa ser habilitada separadamente.

## 2. Ativar sincronização pública (opcional)

Para que cada servidor altere suas preferências a partir de qualquer computador:

1. Crie um projeto Supabase.
2. No SQL Editor, execute o arquivo `supabase.sql` fornecido.
3. Na configuração do projeto, copie o **Project URL** e a chave **anon / publishable (pública)**. Nunca utilize **service_role / secret key**.
4. Edite `config.js` no repositório:

   ```js
   window.PWA_CONFIG = {
     supabaseUrl: 'https://SEU-PROJETO.supabase.co',
     supabaseAnonKey: 'SUA_CHAVE_PUBLICA_ANON'
   };
   ```

5. Recarregue a página após a atualização do GitHub Pages (pode ser necessário limpar o cache do PWA).
6. O cabeçalho passará a mostrar **Dados compartilhados**. Os servidores salvam suas disponibilidades no banco; a aplicação atualiza do servidor ao abrir e aproximadamente a cada 60 segundos enquanto estiver ativa.

**Atenção de segurança:** nesta beta, acesso público significa também edição pública. Não há identificação de quem fez uma mudança, aprovação, bloqueio administrativo nem trilha de auditoria. Qualquer visitante com o link pode editar a disponibilidade de qualquer servidor e o rodízio, e pode sobrescrever escolhas anteriores. Não utilize como escala oficialmente homologada sem definir um procedimento de revisão/publicação. Não armazene informações pessoais sensíveis.

## 3. Arquivos

| Arquivo | Finalidade |
|---|---|
| `index.html` / `styles.css` | Interface do PWA, responsiva |
| `app.js` | Interações, edição e visualizações |
| `data.js` | Cadastro inicial e calendário 2026 |
| `scheduler.js` | Algoritmo de distribuição e checagem |
| `pdf.js` | Geração local do PDF |
| `sync.js` / `config.js` | Armazenamento local e conexão opcional |
| `supabase.sql` | Estrutura e permissões do banco compartilhado |
| `manifest.webmanifest` / `sw.js` / `icons/` | Instalação e cache offline |
| `tests/test-schedule.mjs` | Testes de consistência para quem possui Node |

## 4. Regras e limites da versão beta

- Ano **2026** apenas, sem recurso de alterar os feriados pela interface. Não extrapole o calendário para 2027.
- O dia de rodízio não ignora as escolhas: só entram como candidatos os servidores que selecionaram esse dia ou criaram exceção pontual de disponibilidade.
- Dois servidores do mesmo departamento não são colocados no mesmo dia.
- O algoritmo tenta maximizar a diversidade semanal, o preenchimento e a equidade anual. Com restrições conflitantes, não garante igualdade matemática; apresenta alertas, em vez de fingir conformidade.
- Se a escolha de dias produzir poucas combinações de departamentos, o sistema mostrará vagas pendentes em vez de ignorar as seleções.
- Cada servidor pode marcar qualquer combinação de segunda a sexta e usar os botões **Marcar todos** e **Desmarcar todos**.
- No modo local, alterações de vários usuários não são sincronizadas entre dispositivos. Para produção, o modo compartilhado requer controles adicionais de escrita/auditoria.
- A geração do PDF é implementada com fontes internas padrão do formato PDF e pode usar substituições para símbolos raros, mas suporta os nomes e acentos portugueses do cadastro.

## 5. Testes

Com Node instalado em ambiente de desenvolvimento (não necessário para uso):

```bash
node tests/test-schedule.mjs
```

A interface pode ser aberta por servidor estático local (`python -m http.server`, `npx serve`, VS Code Live Server) e no GitHub Pages; ao abrir `index.html` como `file://`, navegadores podem bloquear os módulos JavaScript.

## 6. Próximos aperfeiçoamentos recomendados

- Publicação/validação de escala por administrador e histórico de versões.
- Bloqueio de alteração da escala homologada, mantendo acesso público à leitura.
- Controle de conflitos de escrita, trilha de auditoria e proteção do endpoint contra abuso.
- Inclusão do calendário de 2027 por importação.

## 7. Atualização da beta 0.1 para 0.2

- **Novo:** segunda, terça, quarta, quinta e sexta ficam habilitadas para todos os servidores.
- **Removido:** bloqueio de Igor fora da quinta-feira, bloqueio de Vanessa às quartas e regra fixa de Letícia quando a quarta era rodízio.
- **Corrigido:** a escala respeita rigorosamente os dias selecionados, inclusive no rodízio.
- **Migração:** dados de disponibilidade salvos no navegador na beta 0.1 são reaproveitados, sem forçar os bloqueios anteriores. As seleções não são alteradas automaticamente; abra **Disponibilidades** e marque os dias que desejar.
- **Atualização no GitHub:** substitua os arquivos da versão 0.1 pelos da versão 0.2 no repositório. O Service Worker usa cache novo (`v02`), permitindo a atualização após recarregar a página.
