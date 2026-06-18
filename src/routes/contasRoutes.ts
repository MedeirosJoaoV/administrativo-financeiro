import { Router } from "express";
import { getDb } from "../database/db";

const router = Router();

// GET /api/contas
router.get("/", async (req, res) => {
    try {
        const db = await getDb();
        const { todos, busca, sortBy, sortOrder } = req.query;

        // Base query
        let query = `
            SELECT 
                m.id, m.tipo, m.valorTotal, m.pessoaId, m.ativo,
                p.razaoSocial as pessoaNome, p.cnpjCpf as pessoaDocumento, p.tipo as pessoaTipo
            FROM MOVIMENTOCONTAS m
            LEFT JOIN PESSOAS p ON m.pessoaId = p.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Return empty array initially if no trigger
        if (todos !== "true" && !busca) {
            return res.json([]);
        }

        // Standard filter: active items
        query += " AND m.ativo = 1";

        // Multi-term search (searches type, person details, or classifications descriptions)
        if (busca) {
            const terms = (busca as string).trim().split(/\s+/);
            terms.forEach(term => {
                query += ` AND (
                    m.tipo LIKE ? OR 
                    p.razaoSocial LIKE ? OR 
                    p.cnpjCpf LIKE ? OR 
                    EXISTS (
                        SELECT 1 
                        FROM MOVIMENTOCLASSIFICACAO mc 
                        JOIN CLASSIFICACAO c ON mc.classificacaoId = c.id 
                        WHERE mc.movimentoId = m.id AND c.descricao LIKE ?
                    )
                )`;
                params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
            });
        }

        // Sorting
        const allowedSortCols = ["id", "tipo", "valorTotal", "pessoaNome"];
        let sortCol = "m.id";
        if (sortBy === "tipo") sortCol = "m.tipo";
        else if (sortBy === "valorTotal") sortCol = "m.valorTotal";
        else if (sortBy === "pessoaNome") sortCol = "pessoaNome";

        const order = sortOrder === "desc" ? "DESC" : "ASC";
        query += ` ORDER BY ${sortCol} ${order}`;

        const rows = await db.all(query, params);

        // Fetch related classifications and installments for each row
        for (const row of rows) {
            // Classifications
            const classifications = await db.all(`
                SELECT c.id, c.tipo, c.descricao 
                FROM MOVIMENTOCLASSIFICACAO mc
                JOIN CLASSIFICACAO c ON mc.classificacaoId = c.id
                WHERE mc.movimentoId = ?
            `, [row.id]);
            row.classificacoes = classifications;

            // Installments (parcelas)
            const parcelas = await db.all(`
                SELECT id, numeroParcela, valor, dataVencimento
                FROM PARCELACONTAS
                WHERE movimentoId = ?
                ORDER BY numeroParcela ASC
            `, [row.id]);
            row.parcelas = parcelas;
        }

        return res.json(rows);
    } catch (error: any) {
        console.error("Erro ao buscar contas:", error);
        return res.status(500).json({ erro: "Erro ao buscar contas", detalhe: error.message });
    }
});

// POST /api/contas (CREATE)
router.post("/", async (req, res) => {
    try {
        const { tipo, valorTotal, pessoaId, classificacoesIds, parcelas } = req.body;
        if (!tipo || valorTotal === undefined || !pessoaId) {
            return res.status(400).json({ erro: "Campos tipo, valorTotal e pessoaId são obrigatórios." });
        }

        const db = await getDb();

        // 1. Insert into MOVIMENTOCONTAS (status defaults to 1 / ATIVO)
        const movimentoResult = await db.run(
            "INSERT INTO MOVIMENTOCONTAS (tipo, valorTotal, pessoaId, ativo) VALUES (?, ?, ?, 1)",
            [tipo, valorTotal, pessoaId]
        );
        const movimentoId = movimentoResult.lastID;

        // 2. Associate Classifications
        if (Array.isArray(classificacoesIds)) {
            for (const classifId of classificacoesIds) {
                await db.run(
                    "INSERT INTO MOVIMENTOCLASSIFICACAO (movimentoId, classificacaoId) VALUES (?, ?)",
                    [movimentoId, classifId]
                );
            }
        }

        // 3. Insert Installments
        if (Array.isArray(parcelas)) {
            for (const p of parcelas) {
                await db.run(
                    "INSERT INTO PARCELACONTAS (numeroParcela, valor, dataVencimento, movimentoId) VALUES (?, ?, ?, ?)",
                    [p.numeroParcela, p.valor, p.dataVencimento, movimentoId]
                );
            }
        }

        // Fetch completed record
        const createdConta = await db.get("SELECT * FROM MOVIMENTOCONTAS WHERE id = ?", [movimentoId]);
        
        // Add relations for response
        createdConta.classificacoes = await db.all(`
            SELECT c.id, c.tipo, c.descricao 
            FROM MOVIMENTOCLASSIFICACAO mc
            JOIN CLASSIFICACAO c ON mc.classificacaoId = c.id
            WHERE mc.movimentoId = ?
        `, [movimentoId]);

        createdConta.parcelas = await db.all(`
            SELECT id, numeroParcela, valor, dataVencimento
            FROM PARCELACONTAS
            WHERE movimentoId = ?
            ORDER BY numeroParcela ASC
        `, [movimentoId]);

        return res.status(201).json(createdConta);
    } catch (error: any) {
        console.error("Erro ao criar conta:", error);
        return res.status(500).json({ erro: "Erro ao criar conta", detalhe: error.message });
    }
});

// PUT /api/contas/:id (UPDATE)
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, valorTotal, pessoaId, classificacoesIds, parcelas } = req.body;
        if (!tipo || valorTotal === undefined || !pessoaId) {
            return res.status(400).json({ erro: "Campos tipo, valorTotal e pessoaId são obrigatórios." });
        }

        const db = await getDb();

        // Check if movement exists
        const existing = await db.get("SELECT id FROM MOVIMENTOCONTAS WHERE id = ?", [id]);
        if (!existing) {
            return res.status(404).json({ erro: "Conta não encontrada." });
        }

        // 1. Update MOVIMENTOCONTAS
        await db.run(
            "UPDATE MOVIMENTOCONTAS SET tipo = ?, valorTotal = ?, pessoaId = ? WHERE id = ?",
            [tipo, valorTotal, pessoaId, id]
        );

        // 2. Recreate classifications links
        await db.run("DELETE FROM MOVIMENTOCLASSIFICACAO WHERE movimentoId = ?", [id]);
        if (Array.isArray(classificacoesIds)) {
            for (const classifId of classificacoesIds) {
                await db.run(
                    "INSERT INTO MOVIMENTOCLASSIFICACAO (movimentoId, classificacaoId) VALUES (?, ?)",
                    [id, classifId]
                );
            }
        }

        // 3. Recreate installments (parcelas)
        await db.run("DELETE FROM PARCELACONTAS WHERE movimentoId = ?", [id]);
        if (Array.isArray(parcelas)) {
            for (const p of parcelas) {
                await db.run(
                    "INSERT INTO PARCELACONTAS (numeroParcela, valor, dataVencimento, movimentoId) VALUES (?, ?, ?, ?)",
                    [p.numeroParcela, p.valor, p.dataVencimento, id]
                );
            }
        }

        // Fetch completed record
        const updatedConta = await db.get("SELECT * FROM MOVIMENTOCONTAS WHERE id = ?", [id]);
        
        // Add relations for response
        updatedConta.classificacoes = await db.all(`
            SELECT c.id, c.tipo, c.descricao 
            FROM MOVIMENTOCLASSIFICACAO mc
            JOIN CLASSIFICACAO c ON mc.classificacaoId = c.id
            WHERE mc.movimentoId = ?
        `, [id]);

        updatedConta.parcelas = await db.all(`
            SELECT id, numeroParcela, valor, dataVencimento
            FROM PARCELACONTAS
            WHERE movimentoId = ?
            ORDER BY numeroParcela ASC
        `, [id]);

        return res.json(updatedConta);
    } catch (error: any) {
        console.error("Erro ao atualizar conta:", error);
        return res.status(500).json({ erro: "Erro ao atualizar conta", detalhe: error.message });
    }
});

// DELETE /api/contas/:id (LOGICAL DELETE)
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDb();

        const existing = await db.get("SELECT id FROM MOVIMENTOCONTAS WHERE id = ?", [id]);
        if (!existing) {
            return res.status(404).json({ erro: "Conta não encontrada." });
        }

        // Logical delete sets ativo = 0 (INATIVO)
        await db.run("UPDATE MOVIMENTOCONTAS SET ativo = 0 WHERE id = ?", [id]);
        return res.json({ sucesso: true, mensagem: "Conta inativada com sucesso." });
    } catch (error: any) {
        console.error("Erro ao inativar conta:", error);
        return res.status(500).json({ erro: "Erro ao inativar conta", detalhe: error.message });
    }
});

export default router;
