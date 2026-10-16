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
2. **Alerta Explícito ao Usuário:**
   - Ao final da sua resposta, você **DEVE obrigatoriamente informar** se todos os arquivos estão dentro dos limites ou se algum arquivo ultrapassou o teto estipulado e **precisa urgente ser modularizado/refatorado**.
3. **Formato do Relatório de Limites:**
```markdown
> 📏 **Auditoria de Limites de Código:**
> - [Nome do Arquivo]: [Nº de Linhas] linhas (Limite: [X] linhas) - [DENTRO DO LIMITE / 🚨 EXCEDEU LIMITE - URGENTE REFATORAR]
```
4. **Procedimento ao Ultrapassar o Limite:**
   - Se qualquer arquivo exceder o limite (ex: `App.css` acima de 500 linhas), você **DEVE alertar com destaque de urgência** e perguntar se o usuário deseja realizar a quebra/modularização imediata (ex: dividir CSS em arquivos por componente/módulo na pasta `styles/`).
   - Não faça refatorações arquiteturais invasivas de quebra sem a confirmação prévia do usuário.

Isso evita a criação de arquivos monolíticos ("God Files"), assegura testes rápidos e mantém a arquitetura limpa e escalável.
