const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function processAll() {
    try {
        const uploadsDir = path.resolve(__dirname, "uploads");
        const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".pdf"));
        console.log(`Encontrados ${files.length} arquivos PDF na pasta uploads.`);

        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            console.log(`\n============================\nProcessando arquivo: ${file}`);
            
            const uploadResult = await ai.files.upload({
                file: filePath,
                mimeType: "application/pdf",
            });

            const prompt = `Extraia os dados da nota fiscal anexada e retorne um objeto JSON válido.
            Estrutura obrigatória:
            {
              "fornecedor": {
                "razaoSocial": "",
                "fantasia": "",
                "cnpj": ""
              },
              "faturado": {
                "nomeCompleto": "",
                "cpf": ""
              },
              "numeroNotaFiscal": "",
              "dataEmissao": "",
              "descricaoProdutos": "",
              "parcelas": [
                {
                  "numeroParcela": 1,
                  "dataVencimento": "",
                  "valor": 0
                }
              ],
              "valorTotal": 0,
              "classificacoesDespesa": [
                {
                  "descricao": "",
                  "valor": 0
                }
              ]
            }`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        role: "user",
                        parts: [
                            { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
                            { text: prompt },
                        ],
                    },
                ],
                config: {
                    responseMimeType: "application/json",
                }
            });

            await ai.files.delete({ name: uploadResult.name });
            console.log(response.text);
        }
    } catch (e) {
        console.error("Erro ao processar PDFs:", e);
    }
}
processAll();
