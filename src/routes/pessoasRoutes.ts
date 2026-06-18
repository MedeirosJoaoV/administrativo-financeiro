import { Router } from "express";
import { getDb } from "../database/db";

const router = Router();

// GET /api/pessoas
router.get("/", async (req, res) => {
    try {
        const db = await getDb();
        const { todos, busca, sortBy, sortOrder } = req.query;

        // Base query
        let query = "SELECT * FROM PESSOAS WHERE 1=1";
        const params: any[] = [];

        // If neither 'todos' nor 'busca' is provided, the table should be empty initially.
        // We handle this by checking if the query parameters are present.
        if (todos !== "true" && !busca) {
            return res.json([]);
        }

        // Standard filter: active items
        query += " AND ativo = 1";

        // Multi-term search
        if (busca) {
            const terms = (busca as string).trim().split(/\s+/);
            terms.forEach(term => {
                query += " AND (razaoSocial LIKE ? OR cnpjCpf LIKE ? OR tipo LIKE ?)";
                params.push(`%${term}%`, `%${term}%`, `%${term}%`);
            });
        }

        // Sorting
        const allowedSortCols = ["id", "tipo", "razaoSocial", "cnpjCpf"];
        const col = allowedSortCols.includes(sortBy as string) ? (sortBy as string) : "id";
        const order = sortOrder === "desc" ? "DESC" : "ASC";
        query += ` ORDER BY ${col} ${order}`;

        const rows = await db.all(query, params);
        return res.json(rows);
    } catch (error: any) {
        console.error("Erro ao buscar pessoas:", error);
        return res.status(500).json({ erro: "Erro ao buscar pessoas", detalhe: error.message });
    }
});

// POST /api/pessoas (CREATE)
router.post("/", async (req, res) => {
    try {
        const { tipo, razaoSocial, cnpjCpf } = req.body;
        if (!tipo || !razaoSocial) {
            return res.status(400).json({ erro: "Campos tipo e razaoSocial são obrigatórios." });
        }

        const db = await getDb();
        
        // Logical Status is hidden in frontend and defaults to 1 (ATIVO)
        const result = await db.run(
            "INSERT INTO PESSOAS (tipo, razaoSocial, cnpjCpf, ativo) VALUES (?, ?, ?, 1)",
            [tipo, razaoSocial, cnpjCpf || null]
        );

        const newPerson = await db.get("SELECT * FROM PESSOAS WHERE id = ?", [result.lastID]);
        return res.status(201).json(newPerson);
    } catch (error: any) {
        console.error("Erro ao criar pessoa:", error);
        if (error.message.includes("UNIQUE")) {
            return res.status(400).json({ erro: "Já existe uma pessoa cadastrada com este CPF/CNPJ." });
        }
        return res.status(500).json({ erro: "Erro ao criar pessoa", detalhe: error.message });
    }
});

// PUT /api/pessoas/:id (UPDATE)
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, razaoSocial, cnpjCpf } = req.body;
        if (!tipo || !razaoSocial) {
            return res.status(400).json({ erro: "Campos tipo e razaoSocial são obrigatórios." });
        }

        const db = await getDb();
        
        // Check if person exists
        const existing = await db.get("SELECT id FROM PESSOAS WHERE id = ?", [id]);
        if (!existing) {
            return res.status(404).json({ erro: "Pessoa não encontrada." });
        }

        // Update preserving the active status (or keeping it unchanged/hidden)
        await db.run(
            "UPDATE PESSOAS SET tipo = ?, razaoSocial = ?, cnpjCpf = ? WHERE id = ?",
            [tipo, razaoSocial, cnpjCpf || null, id]
        );

        const updatedPerson = await db.get("SELECT * FROM PESSOAS WHERE id = ?", [id]);
        return res.json(updatedPerson);
    } catch (error: any) {
        console.error("Erro ao atualizar pessoa:", error);
        if (error.message.includes("UNIQUE")) {
            return res.status(400).json({ erro: "Já existe outra pessoa cadastrada com este CPF/CNPJ." });
        }
        return res.status(500).json({ erro: "Erro ao atualizar pessoa", detalhe: error.message });
    }
});

// DELETE /api/pessoas/:id (LOGICAL DELETE)
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();

        const existing = await db.get("SELECT id FROM PESSOAS WHERE id = ?", [id]);
        if (!existing) {
            return res.status(404).json({ erro: "Pessoa não encontrada." });
        }

        // Logical delete sets ativo = 0 (INATIVO)
        await db.run("UPDATE PESSOAS SET ativo = 0 WHERE id = ?", [id]);
        return res.json({ sucesso: true, mensagem: "Pessoa inativada com sucesso." });
    } catch (error: any) {
        console.error("Erro ao inativar pessoa:", error);
        return res.status(500).json({ erro: "Erro ao inativar pessoa", detalhe: error.message });
    }
});

export default router;
