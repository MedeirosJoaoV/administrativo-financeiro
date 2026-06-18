const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

async function check() {
    try {
        const db = await open({
            filename: path.resolve(__dirname, "database.sqlite"),
            driver: sqlite3.Database,
        });

        console.log("=== SEARCH FOR BELTRANO DE SOUZA ===");
        const beltrano = await db.all("SELECT * FROM PESSOAS WHERE razaoSocial LIKE '%BELTRANO%' OR cnpjCpf LIKE '%111.111.111-11%'");
        console.log(JSON.stringify(beltrano, null, 2));

        console.log("\n=== SEARCH FOR SEMENTES PROGRESSO ===");
        const sementes = await db.all("SELECT * FROM PESSOAS WHERE razaoSocial LIKE '%Sementes%'");
        console.log(JSON.stringify(sementes, null, 2));

        console.log("\n=== CHECK ALL PESSOAS ===");
        const allPessoas = await db.all("SELECT * FROM PESSOAS");
        console.log(`Total Pessoas: ${allPessoas.length}`);
        console.log(JSON.stringify(allPessoas.filter(p => p.razaoSocial.toLowerCase().includes("souza") || p.razaoSocial.toLowerCase().includes("beltrano") || p.razaoSocial.toLowerCase().includes("progresso")), null, 2));

        console.log("\n=== TOTAL PARCELAS BY DATE FOR SEMENTES PROGRESSO ===");
        // Sementes Progresso has id 42 (from task-65 log: "id": 42, "tipo": "FORNECEDOR", "razaoSocial": "Sementes Progresso Ltda", "cnpjCpf": "23.456.789/0001-02")
        const parcelasSementes = await db.all(`
            SELECT p.*, m.valorTotal, m.pessoaId 
            FROM PARCELACONTAS p 
            JOIN MOVIMENTOCONTAS m ON p.movimentoId = m.id 
            WHERE m.pessoaId = 42
        `);
        console.log(JSON.stringify(parcelasSementes, null, 2));

        console.log("\n=== TOTAL MOVIMENTOS IN 2025 ===");
        const movs2025 = await db.all(`
            SELECT m.id, m.valorTotal, pe.razaoSocial, p.dataVencimento
            FROM MOVIMENTOCONTAS m
            JOIN PESSOAS pe ON m.pessoaId = pe.id
            JOIN PARCELACONTAS p ON p.movimentoId = m.id
            WHERE p.dataVencimento LIKE '2025%' AND m.ativo = 1
        `);
        console.log(`Found ${movs2025.length} records in 2025`);

    } catch (e) {
        console.error("Error checking DB:", e);
    }
}
check();
