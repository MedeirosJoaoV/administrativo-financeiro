import { Request, Response } from "express";
import { consultarRagSimples, consultarRagEmbeddings } from "../services/ragService";

export async function consultarRAG(req: Request, res: Response) {
    try {
        const { pergunta, tipo } = req.body;

        if (!pergunta || typeof pergunta !== "string" || pergunta.trim() === "") {
            return res.status(400).json({ erro: "A pergunta é obrigatória e deve ser um texto válido." });
        }

        console.log(`Recebida consulta RAG (${tipo || "simples"}): "${pergunta}"`);

        let resultado;
        if (tipo === "embeddings") {
            resultado = await consultarRagEmbeddings(pergunta);
        } else {
            resultado = await consultarRagSimples(pergunta);
        }

        return res.json({
            sucesso: true,
            resposta: resultado.resposta,
            fontes: resultado.fontes
        });
    } catch (error: any) {
        console.error("ERRO NO CONTROLLER RAG:", error);
        return res.status(500).json({
            erro: "Erro ao processar a consulta RAG",
            detalhe: error.message || error
        });
    }
}
