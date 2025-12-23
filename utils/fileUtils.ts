/**
 * Converts a File object to a Base64 string suitable for Gemini API.
 * It strips the data URL prefix (e.g., "data:application/pdf;base64,").
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check specifically for empty files, which often happens with un-synced cloud placeholders
    if (file.size === 0) {
      reject(new Error("O arquivo está vazio (0 bytes). Se for um arquivo do OneDrive ou Google Drive, certifique-se de que o download foi concluído (botão direito -> 'Manter sempre neste dispositivo')."));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the Data URL prefix to get just the base64 string
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Falha ao processar o conteúdo do arquivo.'));
      }
    };

    reader.onerror = () => {
      // reader.error contains the actual DOMException with details
      const errorMsg = reader.error?.message || "Não foi possível ler o arquivo.";
      reject(new Error(`Erro de leitura: ${errorMsg}. Verifique se o arquivo está acessível localmente.`));
    };

    reader.onabort = () => {
      reject(new Error("A leitura do arquivo foi interrompida."));
    };

    try {
      reader.readAsDataURL(file);
    } catch (e: any) {
      reject(new Error("Erro ao iniciar leitura: " + e.message));
    }
  });
};