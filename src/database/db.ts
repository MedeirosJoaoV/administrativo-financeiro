import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: path.resolve(__dirname, "../../database.sqlite"),
        driver: sqlite3.Database,
    });

    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS PESSOAS (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            razaoSocial TEXT NOT NULL,
            cnpjCpf TEXT UNIQUE,
            ativo INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS CLASSIFICACAO (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            descricao TEXT NOT NULL UNIQUE,
            ativo INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS MOVIMENTOCONTAS (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            valorTotal REAL NOT NULL,
            pessoaId INTEGER NOT NULL,
            ativo INTEGER DEFAULT 1,
            FOREIGN KEY (pessoaId) REFERENCES PESSOAS(id)
        );

        CREATE TABLE IF NOT EXISTS PARCELACONTAS (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numeroParcela INTEGER NOT NULL,
            valor REAL NOT NULL,
            dataVencimento TEXT NOT NULL,
            movimentoId INTEGER NOT NULL,
            FOREIGN KEY (movimentoId) REFERENCES MOVIMENTOCONTAS(id)
        );
        
        CREATE TABLE IF NOT EXISTS MOVIMENTOCLASSIFICACAO (
            movimentoId INTEGER NOT NULL,
            classificacaoId INTEGER NOT NULL,
            FOREIGN KEY (movimentoId) REFERENCES MOVIMENTOCONTAS(id),
            FOREIGN KEY (classificacaoId) REFERENCES CLASSIFICACAO(id),
            PRIMARY KEY (movimentoId, classificacaoId)
        );
    `);

    return dbInstance;
}
