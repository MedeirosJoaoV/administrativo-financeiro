const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

async function dump() {
    try {
        const db = await open({
            filename: path.resolve(__dirname, "database.sqlite"),
            driver: sqlite3.Database,
        });
        
        console.log("=== PESSOAS ===");
        const pessoas = await db.all("SELECT * FROM PESSOAS");
        console.log(JSON.stringify(pessoas, null, 2));

        console.log("\n=== CLASSIFICACAO ===");
        const classificacoes = await db.all("SELECT * FROM CLASSIFICACAO");
        console.log(JSON.stringify(classificacoes, null, 2));

        console.log("\n=== MOVIMENTOCONTAS ===");
        const movimentacoes = await db.all("SELECT * FROM MOVIMENTOCONTAS");
        console.log(JSON.stringify(movimentacoes, null, 2));

        console.log("\n=== PARCELACONTAS ===");
        const parcelas = await db.all("SELECT * FROM PARCELACONTAS");
        console.log(JSON.stringify(parcelas, null, 2));

        console.log("\n=== MOVIMENTOCLASSIFICACAO ===");
        const mc = await db.all("SELECT * FROM MOVIMENTOCLASSIFICACAO");
        console.log(JSON.stringify(mc, null, 2));

    } catch (e) {
        console.error("Error dumping DB:", e);
    }
}
dump();
