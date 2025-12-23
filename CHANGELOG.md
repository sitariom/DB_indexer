# Changelog

Todos as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-05-22

### Adicionado
- **Gerador de Script Python (`renamer.py`)**: Funcionalidade para exportar um script Python que realiza a renomeação dos arquivos localmente. Isso oferece uma alternativa multiplataforma (Windows/Linux/Mac) ao script `.bat`.
- **Botão de Download Python**: Novo botão no Dashboard para baixar o script `renamer.py`.
- **Atualização de Status Automática**: Ao baixar scripts de renomeação (Python ou Batch), os itens no dashboard agora são marcados automaticamente como "Renomeados" para refletir que a ação foi delegada ao script.
- **Detecção de Iframe**: Adicionada verificação explícita (`window.self !== window.top`) no componente de upload. Se a aplicação estiver em um Iframe, ela desativa proativamente a tentativa de usar `showDirectoryPicker`, evitando erros de console e direcionando o usuário para o fluxo de fallback (input de arquivos padrão).

### Corrigido
- Tratamento de erro ao tentar acessar `showDirectoryPicker` em contextos de segurança restritos (Cross-origin sub frames).
- Melhoria na UX para usuários em ambientes de "Modo de Leitura" (sem permissão de escrita no disco), oferecendo scripts de automação como solução primária.

## [1.0.0] - 2024-05-20

### Adicionado
- Lançamento inicial da aplicação.
- Integração com Google Gemini (`gemini-2.0-flash-exp`) para análise de PDFs.
- Sistema de leitura de arquivos locais via File System Access API.
- Dashboard com filtros por Sistema, Seção e Tipo.
- Visualização de métricas da coleção.
- Exportação e Importação de banco de dados JSON.
- Geração de script `.bat` para renomeação em Windows.
- Funcionalidade de edição manual de nomes sugeridos.
- Sistema de Logs individual por arquivo.
