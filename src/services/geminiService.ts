import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extrairDadosPDF(filePath: string) {
    try {
        console.log("Iniciando upload para o Google Gemini...");
        const uploadResult = await ai.files.upload({
            file: filePath,
            mimeType: "application/pdf",
        });

        console.log("Upload concluído. Gerando conteúdo...");

        const prompt = `
Extraia os dados da nota fiscal anexada e retorne SOMENTE um objeto JSON válido.
Caso algum campo não seja encontrado, retorne string vazia "" ou valor 0.

Regra para Classificações de Despesa: Baseando-se nos produtos comprados na Nota Fiscal, classifique o registro em UMA OU MAIS das seguintes categorias de despesas que mais se adequam (insira no campo descricao):
- INSUMOS AGRÍCOLAS
- MANUTENÇÃO E OPERAÇÃO
- RECURSOS HUMANOS
- SERVIÇOS OPERACIONAIS
- INFRAESTRUTURA E UTILIDADES
- ADMINISTRATIVAS
- SEGUROS E PROTEÇÃO
- IMPOSTOS E TAXAS
- INVESTIMENTOS

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
}
`;

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

        console.log("Conteúdo gerado. Removendo arquivo do Gemini...");
        await ai.files.delete({ name: uploadResult.name });

        if (!response.text) {
            throw new Error("Resposta vazia da API do Gemini.");
        }

        return response.text;
    } catch (error) {
        console.error("Erro na API do Gemini:", error);
        throw error;
    }
}
