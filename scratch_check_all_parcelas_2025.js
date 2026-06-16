const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

async function check() {
    try {
        const db = await open({
            filename: path.resolve(__dirname, "database.sqlite"),
            driver: sqlite3.Database,
        });

        console.log("=== PARCELAS A PARTIR DE OUTUBRO DE 2025 ===");
        const parcelas = await db.all(`
            SELECT p.*, m.valorTotal, pe.razaoSocial, pe.tipo as tipoPessoa, pe.cnpjCpf
            FROM PARCELACONTAS p
            JOIN MOVIMENTOCONTAS m ON p.movimentoId = m.id
            JOIN PESSOAS pe ON m.pessoaId = pe.id
            WHERE p.dataVencimento >= '2025-10-01'
            ORDER BY p.dataVencimento ASC
        `);
        console.log(JSON.stringify(parcelas, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}
check();
