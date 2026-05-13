import { Request, Response } from "express";
import { getDb } from "../database/db";

export async function analisarDados(req: Request, res: Response) {
    try {
        const dadosExtraidos = req.body;
        if (!dadosExtraidos) return res.status(400).json({ erro: "Dados não enviados" });

        const db = await getDb();

        // 1. Analisar Fornecedor
        let fornecedorExiste = false;
        let fornecedorId = null;
        if (dadosExtraidos.fornecedor?.cnpj) {
            const fornecedor = await db.get(
                "SELECT id FROM PESSOAS WHERE cnpjCpf = ? AND tipo = 'FORNECEDOR'",
                [dadosExtraidos.fornecedor.cnpj]
            );
            if (fornecedor) {
                fornecedorExiste = true;
                fornecedorId = fornecedor.id;
            }
        }

        // 2. Analisar Faturado (Cliente)
        let faturadoExiste = false;
        let faturadoId = null;
        if (dadosExtraidos.faturado?.cpf) {
            const faturado = await db.get(
                "SELECT id FROM PESSOAS WHERE cnpjCpf = ? AND tipo = 'FATURADO'",
                [dadosExtraidos.faturado.cpf]
            );
            if (faturado) {
                faturadoExiste = true;
                faturadoId = faturado.id;
            }
        }

        // 3. Analisar Despesa (Considerando a primeira classificação ou a que a IA retornar)
        let despesasStatus = [];
        if (dadosExtraidos.classificacoesDespesa && Array.isArray(dadosExtraidos.classificacoesDespesa)) {
            for (const classif of dadosExtraidos.classificacoesDespesa) {
                const desc = classif.descricao?.trim();
                const dbClassif = await db.get(
                    "SELECT id FROM CLASSIFICACAO WHERE descricao = ? AND tipo = 'DESPESA'",
                    [desc]
                );
                despesasStatus.push({
                    descricao: desc,
                    existe: !!dbClassif,
                    id: dbClassif ? dbClassif.id : null
                });
            }
        }

        return res.json({
            sucesso: true,
            analise: {
                fornecedor: {
                    existe: fornecedorExiste,
                    id: fornecedorId,
                    nome: dadosExtraidos.fornecedor?.fantasia || dadosExtraidos.fornecedor?.razaoSocial,
                    documento: dadosExtraidos.fornecedor?.cnpj
                },
                faturado: {
                    existe: faturadoExiste,
                    id: faturadoId,
                    nome: dadosExtraidos.faturado?.nomeCompleto,
                    documento: dadosExtraidos.faturado?.cpf
                },
                despesas: despesasStatus
            }
        });
    } catch (error: any) {
        console.error("ERRO AO ANALISAR DADOS:", error);
        return res.status(500).json({ erro: "Erro ao analisar dados", detalhe: error.message });
    }
}

export async function salvarDados(req: Request, res: Response) {
    try {
        const { dados, analise } = req.body;
        if (!dados || !analise) return res.status(400).json({ erro: "Dados ou análise não enviados" });

        const db = await getDb();

        // Transaction start could be implemented here manually if needed, but for simplicity we'll do sequential queries

        // 1. Gravar/Obter Fornecedor
        let fornecedorId = analise.fornecedor.id;
        if (!fornecedorId && dados.fornecedor?.cnpj) {
            const result = await db.run(
                "INSERT INTO PESSOAS (tipo, razaoSocial, cnpjCpf) VALUES ('FORNECEDOR', ?, ?)",
                [dados.fornecedor.razaoSocial, dados.fornecedor.cnpj]
            );
            fornecedorId = result.lastID;
        }

        // 2. Gravar/Obter Faturado
        let faturadoId = analise.faturado.id;
        if (!faturadoId && dados.faturado?.cpf) {
            const result = await db.run(
                "INSERT INTO PESSOAS (tipo, razaoSocial, cnpjCpf) VALUES ('FATURADO', ?, ?)",
                [dados.faturado.nomeCompleto, dados.faturado.cpf]
            );
            faturadoId = result.lastID;
        }

        // 3. Gravar/Obter Despesas
        let despesasIds: number[] = [];
        for (let i = 0; i < analise.despesas.length; i++) {
            let despesaId = analise.despesas[i].id;
            const descricao = analise.despesas[i].descricao;

            if (!despesaId && descricao) {
                // Try to insert (ignore if exists due to UNIQUE constraint)
                try {
                    const result = await db.run(
                        "INSERT INTO CLASSIFICACAO (tipo, descricao) VALUES ('DESPESA', ?)",
                        [descricao]
                    );
                    despesaId = result.lastID;
                } catch (e: any) {
                    if (e.message.includes("UNIQUE")) {
                        const existing = await db.get("SELECT id FROM CLASSIFICACAO WHERE descricao = ?", [descricao]);
                        despesaId = existing.id;
                    }
                }
            }
            if (despesaId) despesasIds.push(despesaId);
        }

        // 4. Criar MOVIMENTOCONTAS
        const movimentoResult = await db.run(
            "INSERT INTO MOVIMENTOCONTAS (tipo, valorTotal, pessoaId) VALUES ('APAGAR', ?, ?)",
            [dados.valorTotal || 0, fornecedorId]
        );
        const movimentoId = movimentoResult.lastID;

        // Associar o Movimento às classificações de Despesa
        for (const classifId of despesasIds) {
            await db.run(
                "INSERT INTO MOVIMENTOCLASSIFICACAO (movimentoId, classificacaoId) VALUES (?, ?)",
                [movimentoId, classifId]
            );
        }

        // 5. Criar PARCELACONTAS
        if (dados.parcelas && Array.isArray(dados.parcelas)) {
            for (const parcela of dados.parcelas) {
                await db.run(
                    "INSERT INTO PARCELACONTAS (numeroParcela, valor, dataVencimento, movimentoId) VALUES (?, ?, ?, ?)",
                    [parcela.numeroParcela, parcela.valor, parcela.dataVencimento, movimentoId]
                );
            }
        }

        return res.json({ sucesso: true, mensagem: "Registro lançado com sucesso!" });

    } catch (error: any) {
        console.error("ERRO AO SALVAR DADOS:", error);
        return res.status(500).json({ erro: "Erro ao salvar os registros", detalhe: error.message });
    }
}
