const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

async function check() {
    try {
        const db = await open({
            filename: path.resolve(__dirname, "database.sqlite"),
            driver: sqlite3.Database,
        });

        console.log("=== ALL PESSOAS ===");
        const pessoas = await db.all("SELECT * FROM PESSOAS");
        console.log(JSON.stringify(pessoas, null, 2));

        console.log("=== ALL CLASSIFICACAO ===");
        const classifications = await db.all("SELECT * FROM CLASSIFICACAO");
        console.log(JSON.stringify(classifications, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}
check();
