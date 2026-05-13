import { Request, Response } from "express";
import { extrairDadosPDF } from "../services/geminiService";
import fs from "fs";

export async function processarNota(req: Request, res: Response) {
    try {
        const filePath = req.file?.path;

        if (!filePath) {
            return res.status(400).json({ erro: "Arquivo não enviado" });
        }

        console.log("Arquivo recebido:", req.file);

        // 🟡 MOCK ANTES da IA (ESSENCIAL)
        if (process.env.MODO_MOCK === "true") {
            console.log("⚠️ Usando modo mock");

            fs.unlinkSync(filePath);

            return res.json({
                sucesso: true,
                dados: {
                    fornecedor: {
                        razaoSocial: "BELTRANO INSUMOS LTDA",
                        fantasia: "Beltrano Insumos",
                        cnpj: "12.345.678/0001-90"
                    },
                    faturado: {
                        nomeCompleto: "Cliente Exemplo",
                        cpf: "000.000.000-00"
                    },
                    numeroNotaFiscal: "12345",
                    dataEmissao: "2026-04-29",
                    descricaoProdutos: "Insumos diversos conforme nota fiscal",
                    parcelas: [
                        {
                            numeroParcela: 1,
                            dataVencimento: "2026-05-10",
                            valor: 150.0
                        }
                    ],
                    valorTotal: 150.0,
                    classificacoesDespesa: [
                        {
                            descricao: "Insumos",
                            valor: 150.0
                        }
                    ]
                }
            });
        }

        // 🟢 IA real (só roda se não estiver em mock)
        const resultado = await extrairDadosPDF(filePath);

        console.log("Resposta IA:", resultado);

        fs.unlinkSync(filePath);

        let dados;
        try {
            const jsonLimpo = resultado.replace(/```json/g, "").replace(/```/g, "").trim();
            dados = JSON.parse(jsonLimpo);
        } catch {
            return res.status(500).json({
                erro: "Resposta da IA não está em JSON válido",
                detalhe: resultado,
            });
        }

        return res.json({
            sucesso: true,
            dados,
        });

    } catch (error: any) {
        console.error("ERRO AO PROCESSAR:", error);

        if (error.status === 403) {
            return res.status(403).json({
                erro: "Erro de autenticação na API do Gemini",
                detalhe: "Verifique sua GEMINI_API_KEY.",
            });
        }

        if (error.status === 429) {
            return res.status(429).json({
                erro: "Limite de requisições atingido",
                detalhe: "Tente novamente mais tarde.",
            });
        }

        return res.status(500).json({
            erro: "Erro ao processar nota",
            detalhe: error.message || error,
        });
    }
}