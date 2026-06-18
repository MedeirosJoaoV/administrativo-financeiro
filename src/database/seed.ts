import { getDb } from "./db";

async function seed() {
    console.log("Iniciando a semeadura do banco de dados...");
    const db = await getDb();

    // Limpar tabelas para um ambiente de teste limpo e reproduzível
    console.log("Limpando tabelas existentes...");
    await db.run("DELETE FROM MOVIMENTOCLASSIFICACAO");
    await db.run("DELETE FROM PARCELACONTAS");
    await db.run("DELETE FROM MOVIMENTOCONTAS");
    await db.run("DELETE FROM CLASSIFICACAO");
    await db.run("DELETE FROM PESSOAS");
    await db.run("DELETE FROM DOCUMENT_EMBEDDINGS");

    // 1. Cadastrar 40 Pessoas (20 Fornecedores, 10 Clientes, 10 Faturados)
    console.log("Inserindo 40 registros de Pessoas...");
    const pessoas: { tipo: string; razaoSocial: string; cnpjCpf: string; ativo: number }[] = [];
    
    // 20 Fornecedores
    const fornecedoresNomes = [
        "Beltrano Insumos S.A.", "Papelaria Central Ltda", "Distribuidora de Alimentos Sul",
        "Auto Posto Ipiranga", "Telefônica Brasil S.A.", "Companhia Elétrica Light",
        "Construtora Alfa", "Tech Solutions Computadores", "Limpeza Brilhante Serviços",
        "Segurança Total Ltda", "Grafica Rapida Express", "Transportes Veloz",
        "Insumos Agricolas Cerrado", "Supermercado Pão de Açúcar", "Madeireira Pinheiro",
        "Embalagens Plásticas Sul", "Consultoria Financeira Pro", "Clinica Medica Vida",
        "Livraria do Estudante", "Ferreira Ferragens"
    ];
    fornecedoresNomes.forEach((nome, i) => {
        pessoas.push({
            tipo: "FORNECEDOR",
            razaoSocial: nome,
            cnpjCpf: `12.345.678/0001-${(i + 10).toString().padStart(2, "0")}`,
            ativo: i < 18 ? 1 : 0 // 2 inativos
        });
    });

    // 10 Clientes
    const clientesNomes = [
        "João Silva", "Maria Oliveira", "Pedro Santos", "Ana Souza",
        "Carlos Ferreira", "Fernanda Lima", "Lucas Costa", "Juliana Rodrigues",
        "Marcos Pereira", "Beatriz Alves"
    ];
    clientesNomes.forEach((nome, i) => {
        pessoas.push({
            tipo: "CLIENTE",
            razaoSocial: nome,
            cnpjCpf: `123.456.789-${(i + 10).toString().padStart(2, "0")}`,
            ativo: i < 9 ? 1 : 0 // 1 inativo
        });
    });

    // 10 Faturados
    const faturadosNomes = [
        "Indústria Têxtil Fênix", "Comércio de Roupas Chic", "Restaurante Bom Sabor",
        "Padaria Pão Quente", "Auto Mecânica AutoFix", "Escola Novo Saber",
        "Academia Corpo Forte", "Farmácia Saúde", "Salão de Beleza Real",
        "Hotel Boa Estadia"
    ];
    faturadosNomes.forEach((nome, i) => {
        pessoas.push({
            tipo: "FATURADO",
            razaoSocial: nome,
            cnpjCpf: `98.765.432/0001-${(i + 10).toString().padStart(2, "0")}`,
            ativo: i < 9 ? 1 : 0 // 1 inativo
        });
    });

    const pessoasIds: { id: number; tipo: string; ativo: number }[] = [];
    for (const p of pessoas) {
        const res = await db.run(
            "INSERT INTO PESSOAS (tipo, razaoSocial, cnpjCpf, ativo) VALUES (?, ?, ?, ?)",
            [p.tipo, p.razaoSocial, p.cnpjCpf, p.ativo]
        );
        pessoasIds.push({ id: res.lastID, tipo: p.tipo, ativo: p.ativo });
    }

    // 2. Cadastrar 10 Classificações (4 Receitas, 6 Despesas)
    console.log("Inserindo 10 Classificações...");
    const classificacoes = [
        { tipo: "RECEITA", descricao: "Venda de Mercadorias", ativo: 1 },
        { tipo: "RECEITA", descricao: "Prestação de Serviços", ativo: 1 },
        { tipo: "RECEITA", descricao: "Rendimentos Financeiros", ativo: 1 },
        { tipo: "RECEITA", descricao: "Locação de Imóveis", ativo: 1 },
        
        { tipo: "DESPESA", descricao: "Compra de Insumos", ativo: 1 },
        { tipo: "DESPESA", descricao: "Energia Elétrica e Água", ativo: 1 },
        { tipo: "DESPESA", descricao: "Internet e Telefonia", ativo: 1 },
        { tipo: "DESPESA", descricao: "Combustíveis e Lubrificantes", ativo: 1 },
        { tipo: "DESPESA", descricao: "Aluguel e Condomínio", ativo: 1 },
        { tipo: "DESPESA", descricao: "Material de Escritório", ativo: 1 }
    ];

    const classificacoesIds: { id: number; tipo: string }[] = [];
    for (const c of classificacoes) {
        const res = await db.run(
            "INSERT INTO CLASSIFICACAO (tipo, descricao, ativo) VALUES (?, ?, ?)",
            [c.tipo, c.descricao, c.ativo]
        );
        classificacoesIds.push({ id: res.lastID, tipo: c.tipo });
    }

    // 3. Cadastrar 150 Contas (Movimentações Financeiras) com parcelas e classificações
    console.log("Inserindo 150 Movimentações Financeiras...");
    
    // Vamos gerar 100 Contas a Pagar e 50 Contas a Receber
    const meses = [
        "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"
    ];

    for (let i = 1; i <= 150; i++) {
        // Alterna entre APAGAR (despesa) e ARECEBER (receita). 
        // 1 a 100 serão APAGAR, 101 a 150 serão ARECEBER
        const isApagar = i <= 100;
        const tipoMov = isApagar ? "APAGAR" : "ARECEBER";
        
        // Seleciona pessoaId condizente:
        // APAGAR -> FORNECEDOR (ids indexados de 0 a 19)
        // ARECEBER -> CLIENTE / FATURADO (ids indexados de 20 a 39)
        let pessoaObj;
        if (isApagar) {
            const fornPessoas = pessoasIds.filter(p => p.tipo === "FORNECEDOR");
            pessoaObj = fornPessoas[(i - 1) % fornPessoas.length];
        } else {
            const recPessoas = pessoasIds.filter(p => p.tipo !== "FORNECEDOR");
            pessoaObj = recPessoas[(i - 101) % recPessoas.length];
        }

        // Valor total aleatório realista entre R$ 100,00 e R$ 15.000,00
        const valorTotal = Math.round((Math.random() * 14900 + 100) * 100) / 100;
        
        // Status ativo (cerca de 10% inativos para testar exclusão lógica)
        const ativo = i % 15 === 0 ? 0 : 1;

        // Inserir conta
        const resMov = await db.run(
            "INSERT INTO MOVIMENTOCONTAS (tipo, valorTotal, pessoaId, ativo) VALUES (?, ?, ?, ?)",
            [tipoMov, valorTotal, pessoaObj.id, ativo]
        );
        const movimentoId = resMov.lastID;

        // Associar classificação correspondente
        // APAGAR -> DESPESAS, ARECEBER -> RECEITAS
        const classifsFiltradas = classificacoesIds.filter(c => c.tipo === (isApagar ? "DESPESA" : "RECEITA"));
        const classifObj = classifsFiltradas[i % classifsFiltradas.length];

        await db.run(
            "INSERT INTO MOVIMENTOCLASSIFICACAO (movimentoId, classificacaoId) VALUES (?, ?)",
            [movimentoId, classifObj.id]
        );

        // Gerar parcelas (de 1 a 4 parcelas)
        const numParcelas = (i % 4) + 1; // 1, 2, 3 ou 4 parcelas
        const valorParcelaBase = Math.round((valorTotal / numParcelas) * 100) / 100;
        let valorRestante = valorTotal;

        const ano = 2025 + (i % 2); // Anos 2025 e 2026
        const mesIndex = i % 12;

        for (let pNum = 1; pNum <= numParcelas; pNum++) {
            let valorParcela = valorParcelaBase;
            if (pNum === numParcelas) {
                // Ajusta a última parcela com a diferença de arredondamento
                valorParcela = Math.round(valorRestante * 100) / 100;
            }
            valorRestante -= valorParcela;

            // Determinar vencimento (1 parcela por mês)
            const mIndex = (mesIndex + pNum - 1) % 12;
            const aOffset = Math.floor((mesIndex + pNum - 1) / 12);
            const vencimentoAno = ano + aOffset;
            const vencimentoMes = meses[mIndex];
            const dataVencimento = `${vencimentoAno}-${vencimentoMes}-15`;

            await db.run(
                "INSERT INTO PARCELACONTAS (numeroParcela, valor, dataVencimento, movimentoId) VALUES (?, ?, ?, ?)",
                [pNum, valorParcela, dataVencimento, movimentoId]
            );
        }
    }

    console.log("Database seeded com sucesso!");
    console.log("Total de Pessoas: 40");
    console.log("Total de Classificações: 10");
    console.log("Total de Contas a Pagar/Receber: 150");
    console.log("=== Semeadura Concluída ===");
}

seed().catch(err => {
    console.error("Erro ao semear banco de dados:", err);
});
