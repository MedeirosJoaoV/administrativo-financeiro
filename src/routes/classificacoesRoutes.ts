import { Router } from "express";
import { getDb } from "../database/db";

const router = Router();

// GET /api/classificacoes
router.get("/", async (req, res) => {
    try {
        const db = await getDb();
        const { todos, busca, sortBy, sortOrder } = req.query;

        // Base query
        let query = "SELECT * FROM CLASSIFICACAO WHERE 1=1";
        const params: any[] = [];

        // Return empty array initially if no trigger
        if (todos !== "true" && !busca) {
            return res.json([]);
        }

        // Standard filter: active items
        query += " AND ativo = 1";

        // Multi-term search
        if (busca) {
            const terms = (busca as string).trim().split(/\s+/);
            terms.forEach(term => {
                query += " AND (descricao LIKE ? OR tipo LIKE ?)";
                params.push(`%${term}%`, `%${term}%`);
            });
        }

        // Sorting
        const allowedSortCols = ["id", "tipo", "descricao"];
        const col = allowedSortCols.includes(sortBy as string) ? (sortBy as string) : "id";
        const order = sortOrder === "desc" ? "DESC" : "ASC";
        query += ` ORDER BY ${col} ${order}`;

        const rows = await db.all(query, params);
        return res.json(rows);
    } catch (error: any) {
        console.error("Erro ao buscar classificações:", error);
        return res.status(500).json({ erro: "Erro ao buscar classificações", detalhe: error.message });
    }
});

// POST /api/classificacoes (CREATE)
router.post("/", async (req, res) => {
    try {
        const { tipo, descricao } = req.body;
        if (!tipo || !descricao) {
            return res.status(400).json({ erro: "Campos tipo e descricao são obrigatórios." });
        }

        const db = await getDb();
        
        // Status defaults to 1 (ATIVO)
        const result = await db.run(
            "INSERT INTO CLASSIFICACAO (tipo, descricao, ativo) VALUES (?, ?, 1)",
            [tipo, descricao]
        );

        const newClass = await db.get("SELECT * FROM CLASSIFICACAO WHERE id = ?", [result.lastID]);
        return res.status(201).json(newClass);
    } catch (error: any) {
        console.error("Erro ao criar classificação:", error);
        if (error.message.includes("UNIQUE")) {
            return res.status(400).json({ erro: "Já existe uma classificação com esta descrição." });
        }
        return res.status(500).json({ erro: "Erro ao criar classificação", detalhe: error.message });
    }
});

// PUT /api/classificacoes/:id (UPDATE)
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, descricao } = req.body;
        if (!tipo || !descricao) {
            return res.status(400).json({ erro: "Campos tipo e descricao são obrigatórios." });
        }

        const db = await getDb();

        const existing = await db.get("SELECT id FROM CLASSIFICACAO WHERE id = ?", [id]);
        if (!existing) {
            return res.status(404).json({ erro: "Classificação não encontrada." });
        }

        await db.run(
            "UPDATE CLASSIFICACAO SET tipo = ?, descricao = ? WHERE id = ?",
            [tipo, descricao, id]
        );

        const updatedClass = await db.get("SELECT * FROM CLASSIFICACAO WHERE id = ?", [id]);
        return res.json(updatedClass);
    } catch (error: any) {
        console.error("Erro ao atualizar classificação:", error);
        if (error.message.includes("UNIQUE")) {
            return res.status(400).json({ erro: "Já existe outra classificação com esta descrição." });
        }
        return res.status(500).json({ erro: "Erro ao atualizar classificação", detalhe: error.message });
    }
});

// DELETE /api/classificacoes/:id (LOGICAL DELETE)
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();

        const existing = await db.get("SELECT id FROM CLASSIFICACAO WHERE id = ?", [id]);
        if (!existing) {
            return res.status(404).json({ erro: "Classificação não encontrada." });
        }

        // Logical delete sets ativo = 0 (INATIVO)
        await db.run("UPDATE CLASSIFICACAO SET ativo = 0 WHERE id = ?", [id]);
        return res.json({ sucesso: true, mensagem: "Classificação inativada com sucesso." });
    } catch (error: any) {
        console.error("Erro ao inativar classificação:", error);
        return res.status(500).json({ erro: "Erro ao inativar classificação", detalhe: error.message });
    }
});

export default router;
