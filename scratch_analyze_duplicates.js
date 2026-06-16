const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

async function analyze() {
    try {
        const db = await open({
            filename: path.resolve(__dirname, "database.sqlite"),
            driver: sqlite3.Database,
        });

        // 1. Get all pessoas
        const pessoas = await db.all("SELECT * FROM PESSOAS");

        // 2. Normalize and check for duplicate CNPJ/CPF or similar names
        console.log("=== ANALISANDO DUPLICIDADES DE CADASTROS (MESMA EMPRESA/PESSOA COM REGISTROS DIFERENTES) ===");
        const cleaned = pessoas.map(p => {
            const cleanDoc = p.cnpjCpf ? p.cnpjCpf.replace(/\D/g, "") : "";
            const cleanName = p.razaoSocial.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
                .replace(/\s+/g, " ")
                .trim();
            return { ...p, cleanDoc, cleanName };
        });

        // Group by cleanDoc (excluding empty ones)
        const byDoc = {};
        cleaned.forEach(p => {
            if (p.cleanDoc) {
                if (!byDoc[p.cleanDoc]) byDoc[p.cleanDoc] = [];
                byDoc[p.cleanDoc].push(p);
            }
        });

        console.log("\n--- Cadastros com o mesmo CPF/CNPJ duplicados: ---");
        let foundDupDoc = false;
        for (const doc in byDoc) {
            if (byDoc[doc].length > 1) {
                foundDupDoc = true;
                console.log(`Documento: ${doc}`);
                for (const p of byDoc[doc]) {
                    const movs = await db.all("SELECT COUNT(*) as cnt, SUM(valorTotal) as total FROM MOVIMENTOCONTAS WHERE pessoaId = ?", [p.id]);
                    console.log(`  - ID: ${p.id}, Nome original: "${p.razaoSocial}", Tipo: ${p.tipo}, Ativo: ${p.ativo}, Movimentações associadas: ${movs[0].cnt} (Valor total: R$ ${movs[0].total?.toFixed(2) || "0.00"})`);
                }
            }
        }
        if (!foundDupDoc) console.log("Nenhum CPF/CNPJ idêntico duplicado encontrado.");

        // Group by similar names (fuzzy or exact name matches)
        console.log("\n--- Cadastros com nomes muito semelhantes ou iguais: ---");
        const byName = {};
        cleaned.forEach(p => {
            // we can extract the first two words of the name or check exact matches
            const words = p.cleanName.split(" ");
            const coreName = words.slice(0, 2).join(" ");
            if (!byName[coreName]) byName[coreName] = [];
            byName[coreName].push(p);
        });

        let foundDupName = false;
        for (const core in byName) {
            if (byName[core].length > 1) {
                foundDupName = true;
                console.log(`Core Nome: "${core}"`);
                for (const p of byName[core]) {
                    const movs = await db.all("SELECT COUNT(*) as cnt, SUM(valorTotal) as total FROM MOVIMENTOCONTAS WHERE pessoaId = ?", [p.id]);
                    console.log(`  - ID: ${p.id}, Nome original: "${p.razaoSocial}", Documento: "${p.cnpjCpf}", Tipo: ${p.tipo}, Ativo: ${p.ativo}, Movimentações: ${movs[0].cnt} (Valor total: R$ ${movs[0].total?.toFixed(2) || "0.00"})`);
                }
            }
        }
        if (!foundDupName) console.log("Nenhuma duplicidade de nome encontrada.");

    } catch (e) {
        console.error("Error running analysis:", e);
    }
}
analyze();
