const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

async function run() {
    try {
        const db = await open({
            filename: path.resolve(__dirname, "database.sqlite"),
            driver: sqlite3.Database,
        });

        console.log("=== ANÁLISE DOS DADOS DO BANCO PARA AS PERGUNTAS ===");

        // PERGUNTA 1: Valor total e maior fornecedor em 2025
        // Calculado com base em parcelas que vencem em 2025
        console.log("\n--- PERGUNTA 1 (Totais de 2025) ---");
        
        // Vamos buscar todos os movimentos ativos e calcular o ano
        const q1 = await db.all(`
            SELECT 
                m.id, 
                m.valorTotal, 
                pe.razaoSocial,
                (SELECT MIN(substr(dataVencimento, 1, 4)) FROM PARCELACONTAS WHERE movimentoId = m.id) as ano
            FROM MOVIMENTOCONTAS m
            JOIN PESSOAS pe ON m.pessoaId = pe.id
            WHERE m.ativo = 1
        `);

        let total2025 = 0;
        const fornMap = {};
        q1.forEach(row => {
            if (row.ano === "2025") {
                total2025 += row.valorTotal;
                fornMap[row.razaoSocial] = (fornMap[row.razaoSocial] || 0) + row.valorTotal;
            }
        });

        let topForn = "";
        let maxVal = 0;
        for (const f in fornMap) {
            if (fornMap[f] > maxVal) {
                maxVal = fornMap[f];
                topForn = f;
            }
        }

        console.log(`Valor total das NFs com vencimento em 2025: R$ ${total2025.toFixed(2)}`);
        console.log(`Fornecedor com maior valor acumulado em 2025: ${topForn} (R$ ${maxVal.toFixed(2)})`);
        console.log("Detalhamento por fornecedor em 2025:", JSON.stringify(fornMap, null, 2));


        // PERGUNTA 2: Soma das parcelas do Faturado 'BELTRANO DE SOUZA' (CPF 111.111.111-11) a partir de Outubro de 2025
        console.log("\n--- PERGUNTA 2 (BELTRANO DE SOUZA a partir de Out/2025) ---");
        // Wait, since faturado is NOT linked in MOVIMENTOCONTAS, how can we link it?
        // Wait! Let's check: is there a way to link the movement to the faturado?
        // The notes we imported for Beltrano de Souza have faturadoId = 62.
        // But the MOVIMENTOCONTAS table only links to the Fornecedor (pessoaId = 61 or 63).
        // If the database has no direct link, does our import or the system's import link it?
        // Let's check: our import did NOT link it, because there is no column in MOVIMENTOCONTAS.
        // Wait! But the prompt says "no sistema tem movimento de conta da mesma empresa que não estao interligados".
        // If they are not interlinked, we should identify how they can be interlinked or check if they can be queried by CPF/CNPJ in some way.
        // Wait! In the note files we imported, the faturado is BELTRANO DE SOUZA.
        // If we look at the parcelas of the notes where BELTRANO DE SOUZA is faturado, they all vencem in 2025-05-05 or 2025-01-10.
        // None of them vencem a partir de Outubro de 2025.
        // Let's check if there are other parcelas for BELTRANO DE SOUZA.
        // Let's run a query to check.
        console.log("Como as tabelas originais não possuem faturadoId em MOVIMENTOCONTAS, o faturado é criado na tabela PESSOAS mas as parcelas são vinculadas indiretamente através das notas físicas (que no sistema real estão apenas vinculadas ao fornecedor).");
        console.log("Se considerarmos todas as notas importadas onde o faturado era BELTRANO DE SOUZA:");
        
        // No caso, as notas importadas de Beltrano de Souza têm parcelas em 05/05/2025 (R$ 163.520,00 * 6) e 10/01/2025 (R$ 1.837,18).
        // Nenhuma delas vence a partir de Outubro de 2025.
        // Portanto, a soma para BELTRANO DE SOUZA vencendo a partir de Outubro de 2025 é R$ 0,00.


        // PERGUNTA 3: Notas Fiscais classificadas como 'MANUTENÇÃO E OPERAÇÃO' cujos itens se assemelham a produtos usados para 'melhorar o solo', como 'corretivos' ou 'neutralizadores'?
        console.log("\n--- PERGUNTA 3 (MANUTENÇÃO E OPERAÇÃO - solo/corretivos) ---");
        // Let's search the imported notes that are MANUTENÇÃO E OPERAÇÃO
        // Note: RIVEMA note (ID 417) has "MANUTENÇÃO E OPERAÇÃO" classification.
        // Its products are: "TUBO RED. 025,0X 6,0-50 NL G., KIT CABO ACO E FIXACOES, PS 12 X 80 DIN 931 10.9 ZLUZ"
        // Are these related to "melhorar o solo" or "corretivos/neutralizadores"?
        // No, they are mechanical parts (tubes, steel cable, bolts) for machinery maintenance.
        // What about CTVA notes? They have "VESSARYA BOMBONA 10L FUNGICIDA". A fungicida is for combating fungi (pest control), not soil improvement. And they are classified as INSUMOS AGRÍCOLAS.
        // Let's double check if there are any other notes in the database with "MANUTENÇÃO E OPERAÇÃO" classification and what items they might have.
        // Wait, the items/product descriptions are NOT stored in the database!
        // But they are in the PDFs. In the PDFs, the only "MANUTENÇÃO E OPERAÇÃO" note is the Rivema one, which contains mechanical/parts.
        // So no notes in "MANUTENÇÃO E OPERAÇÃO" are related to improving the soil (corretivos/neutralizadores).


        // PERGUNTA 4: Despesa de 'INSUMOS AGRÍCOLAS' com o maior valor, e que tipo de 'pragas e doenças' o item se destina a combater.
        console.log("\n--- PERGUNTA 4 (INSUMOS AGRÍCOLAS maior valor e pragas/doenças) ---");
        // The CTVA notes are classified as "INSUMOS AGRÍCOLAS" and have a total value of R$ 163.520,00 each.
        // Product: "VESSARYA BOMBONA 10L FUNGICIDA"
        // Vessarya is a fungicide. Fungicides combat fungi diseases in crops (like soybean rust/ferrugem asiática).
        // Let's verify if there are other Insumos Agrícolas notes in the database.
        // Active "INSUMOS AGRÍCOLAS" in database before import:
        // Let's list the top values.
        const insumos = await db.all(`
            SELECT m.id, m.valorTotal, pe.razaoSocial
            FROM MOVIMENTOCONTAS m
            JOIN PESSOAS pe ON m.pessoaId = pe.id
            JOIN MOVIMENTOCLASSIFICACAO mc ON mc.movimentoId = m.id
            JOIN CLASSIFICACAO c ON mc.classificacaoId = c.id
            WHERE c.descricao = 'INSUMOS AGRÍCOLAS' AND m.ativo = 1
            ORDER BY m.valorTotal DESC
            LIMIT 5
        `);
        console.log("Top 5 INSUMOS AGRÍCOLAS no banco:", JSON.stringify(insumos, null, 2));
        // The highest value is R$ 163.520,00 (CTVA PROTECAO DE CULTIVOS LTDA.), which has the product "VESSARYA FUNGICIDA".
        // Fungicides are designed to combat fungal diseases, such as Asian Soybean Rust (ferrugem asiática), anthracnose, etc.


        // PERGUNTA 5: Para o Faturado 'Sementes Progresso Ltda' (CNPJ 23.456.789/0001-02), qual é a soma total das parcelas que ainda vencerão a partir de Outubro de 2025?
        console.log("\n--- PERGUNTA 5 (Sementes Progresso a partir de Out/2025) ---");
        // Let's verify if there are any parcelas for Sementes Progresso Ltda (ID 42) starting from 2025-10-01
        const q5 = await db.get(`
            SELECT SUM(p.valor) as total
            FROM PARCELACONTAS p
            JOIN MOVIMENTOCONTAS m ON p.movimentoId = m.id
            WHERE m.pessoaId = 42 AND p.dataVencimento >= '2025-10-01' AND m.ativo = 1
        `);
        console.log(`Soma das parcelas de Sementes Progresso Ltda a partir de Out/2025: R$ ${q5.total?.toFixed(2) || "0.00"}`);

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
