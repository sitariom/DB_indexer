# Indexer de artigos

Uma aplicação web  desenvolvida para automatizar a organização, catalogação e renomeação de coleções digitais. Utiliza a inteligência artificial do Google Gemini (modelo `gemini-2.0-flash-exp`) para analisar o conteúdo de arquivos PDF locais, extrair metadados precisos e padronizar a nomenclatura dos arquivos.

## Funcionalidades Principais

### 1. Análise Inteligente de Conteúdo
*   **Extração de Metadados**: Identifica automaticamente o número da edição, seção da revista, sistema, tipo de conteúdo e título da matéria.
*   **Resumo Automático**: Gera um breve resumo do conteúdo do PDF.
*   **Geração de Slug**: Cria nomes de arquivo padronizados e seguros para sistemas de arquivos.

### 2. Gestão de Arquivos Local
*   **File System Access API**: Suporte para leitura e renomeação direta de arquivos no disco do usuário (disponível em navegadores baseados em Chromium, como Chrome e Edge).
*   **Fallback para Ambientes Restritos**: Detecção automática de ambientes onde o acesso direto ao disco é bloqueado (Iframes, Firefox, conexões não seguras).
*   **Scripts de Renomeação**: Geração automática de scripts `.bat` (Windows) e `.py` (Python/Cross-platform) para aplicar as renomeações em lote quando o acesso direto não é possível.

### 3. Dashboard Interativo
*   **Métricas em Tempo Real**: Visualização da quantidade de edições únicas, sistemas e aventuras identificadas.
*   **Filtros Avançados**: Busca por texto, sistema de RPG, tipo de conteúdo e seção da revista.
*   **Edição Manual**: Permite ao usuário corrigir nomes sugeridos pela IA antes da aplicação.
*   **Persistência**: Importação e exportação do banco de dados em formato JSON para backup da catalogação.

## Padrão de Nomenclatura

A aplicação padroniza os arquivos seguindo estritamente o formato:

```text
DB_{Edição}_{Slug}.pdf
```

Exemplo:
*   Original: `dragao_brasil_123_nova_raca.pdf`
*   Processado: `DB_123_Tormenta20_Nova_Raca_Elfo.pdf`

## Tecnologias Utilizadas

*   **Frontend**: React 19, TypeScript, Tailwind CSS.
*   **AI/ML**: Google GenAI SDK (`@google/genai`), modelo `gemini-2.0-flash-exp`.
*   **Ícones**: Lucide React.
*   **Renderização Markdown**: react-markdown.

## Configuração e Instalação

1.  **Pré-requisitos**:
    *   Node.js (versão LTS recomendada).
    *   Uma API Key válida do Google AI Studio.

2.  **Variáveis de Ambiente**:
    A aplicação requer a chave de API configurada no ambiente de build ou execução:
    ```bash
    API_KEY=sua_chave_aqui
    ```

3.  **Execução**:
    ```bash
    npm install
    npm start
    ```

## Notas de Segurança e Privacidade

*   Os arquivos PDF são processados localmente pelo navegador para conversão em Base64 e enviados para a API do Google Gemini para análise.
*   Nenhum arquivo é armazenado permanentemente em servidores externos pela aplicação; o fluxo é transacional para fins de análise.
*   O acesso ao sistema de arquivos local requer permissão explícita do usuário a cada sessão.

---
**Status do Projeto**: Ativo (v1.1.0)
