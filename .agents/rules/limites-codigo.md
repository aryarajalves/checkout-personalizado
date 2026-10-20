---
trigger: always_on
---

# Regra de Limites de Código (Clean Code e Modularização)

Para garantir que o projeto permaneça manutenível, legível e que o agente consiga processar os arquivos com precisão sem perder contexto, estabelecemos limites rígidos de tamanho de arquivo.

**Limites Obrigatórios:**
1. **Backend (Python):** Nenhum arquivo deve ultrapassar **1.000 linhas**.
2. **Frontend (React, JSX, JS, TS e CSS):** Nenhum arquivo deve ultrapassar **500 linhas**.
   - ⚠️ **Arquivos CSS são classificados como Frontend:** Qualquer folha de estilo (`.css`, `.scss`) obedece estritamente ao teto de **500 linhas**.

---

## 🚨 Protocolo Obrigatório de Auditoria Contínua em Toda Resposta:

Toda vez que você criar ou atualizar qualquer tipo de código no sistema (backend ou frontend/CSS):

1. **Auditoria Obrigatória de Tamanho:**
   - Inspecione as linhas dos arquivos afetados e criados.
2. **Alerta Explícito ao Usuário (Apenas Arquivos que Precisam de Refatoração):**
   - **PROIBIDO listar arquivos que estão dentro do limite:** Se o arquivo estiver dentro do limite, **NÃO liste** e **NÃO polua a resposta** com itens `[DENTRO DO LIMITE]`.
   - **Se todos os arquivos estiverem dentro do limite:** Não mostre lista alguma. Apenas confirme que todos os códigos estão em conformidade (ou omita se tudo estiver normal).
   - **Se algum arquivo ultrapassar o limite:** Liste **EXCLUSIVAMENTE** os arquivos que ultrapassaram o teto estipulado e que **precisam ser refatorados/modularizados**.
3. **Formato do Relatório de Limites (Apenas para Arquivos que Excederam o Limite):**
```markdown
> 📏 **Auditoria de Limites de Código (Arquivos que precisam ser refatorados):**
> - [Nome do Arquivo]: [Nº de Linhas] linhas (Limite: [X] linhas) - 🚨 EXCEDEU LIMITE - URGENTE REFATORAR
```
4. **Procedimento ao Ultrapassar o Limite:**
   - Se qualquer arquivo exceder o limite (ex: folha de estilo ou componente acima de 500 linhas), você **DEVE alertar com destaque de urgência** listando apenas ele e perguntar se o usuário deseja realizar a quebra/modularização imediata.
   - Não faça refatorações arquiteturais invasivas de quebra sem a confirmação prévia do usuário.

Isso evita a criação de arquivos monolíticos ("God Files"), assegura respostas limpas e objetivas, e mantém a arquitetura limpa e escalável.
