import { GoogleGenAI, Type } from "@google/genai";
import { RpgMetadata } from "../types";

// Ensure API key is available
if (!process.env.API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends a PDF base64 string to Gemini and requests structured metadata specialized for Dragão Brasil magazine.
 */
export const analyzeRpgPdf = async (base64Pdf: string, fileName: string): Promise<RpgMetadata> => {
  try {
    const modelId = 'gemini-2.0-flash-exp'; 

    const prompt = `
      Você é o Arquivista Oficial da **Revista Dragão Brasil** (DB).
      Sua tarefa é analisar o arquivo PDF fornecido e extrair metadados precisos.

      Arquivo original: "${fileName}"

      DIRETRIZES DE EXTRAÇÃO:

      1. **Número da Edição (magazine_edition)**:
         - Procure por "Dragão Brasil #XX", "DB XX".
         - Retorne APENAS o número (ex: "110", "123"). 

      2. **Seção / Coluna (magazine_section)**:
         - Qual coluna fixa da revista é esta?
         - Ex: "Chefe de Fase", "Dicas de Mestre", "Caverna do Saber", "Gazeta do Reinado", "Resenha", "Toolbox", "Lendas Lendárias".

      3. **Sistema de RPG (rpg_system)**:
         - Qual o sistema de regras principal? (ex: "T20", "DnD5e", "3D&T", "Genérico").

      4. **Tipo de Conteúdo (content_type)**:
         - Classifique a natureza do material em uma destas categorias:
           - "Aventura" (Roteiros de jogo completos ou breves)
           - "Regras" (Novos talentos, classes, magias, mecânicas)
           - "Cenário" (Descrições de lugares, reinos, gazetas)
           - "Conto" (Ficção literária)
           - "Ficha" (Estatísticas de NPC, monstros, adaptações de personagens)
           - "Item" (Novos itens mágicos ou equipamentos)
           - "Bestiário" (Novas criaturas/ameaças)
           - "Dicas" (Conselhos para mestre/jogador)
           - "Notícia" (Novidades do mercado)
           - "Review" (Análise de produtos)
           - "Quadrinho"

      5. **Título da Matéria (official_title)**:
         - O título principal do conteúdo.

      6. **Slug para Arquivo (filename_slug)**:
         - Crie um slug baseado no Título e no Sistema.
         - Ex: "T20_Novos_Talentos", "DnD5e_Review_Vecna".

      7. **Resumo (summary)**:
         - Resumo curto (máx 150 chars).

      Retorne APENAS o JSON.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            official_title: { type: Type.STRING },
            magazine_edition: { type: Type.STRING },
            magazine_section: { type: Type.STRING },
            rpg_system: { type: Type.STRING },
            content_type: { type: Type.STRING },
            summary: { type: Type.STRING },
            filename_slug: { type: Type.STRING },
          },
          required: ["official_title", "magazine_edition", "magazine_section", "rpg_system", "content_type", "summary", "filename_slug"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("A resposta da IA estava vazia.");
    }

    // CLEANUP: Gemini sometimes returns markdown code blocks ```json ... ```
    const cleanText = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    try {
      const data = JSON.parse(cleanText) as RpgMetadata;
      return data;
    } catch (parseError) {
      console.error("JSON Parse Failed. Raw text:", text);
      throw new Error("Falha ao processar a resposta JSON da IA.");
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let errorMessage = "Erro ao analisar.";
    
    if (error.message) {
      if (error.message.includes("429")) {
        errorMessage = "Limite de requisições (429). Aguarde...";
      } else if (error.message.includes("404")) {
        errorMessage = "Modelo indisponível ou API Key inválida.";
      } else if (error.message.includes("SAFETY")) {
        errorMessage = "Conteúdo bloqueado por filtro de segurança.";
      }
    }
    throw new Error(errorMessage);
  }
};