import { GoogleGenAI } from "@google/genai";
import { getDb } from "../database/db";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Lista de stopwords básicas em português para o RAG Simples
const STOPWORDS = new Set([
    "de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "com", "não", "uma", "os", "no", "se", "na", "por", "mais", "as", "dos", "das", "como", "mas", "ao", "ele", "das", "à", "seus", "suas", "nas", "nos", "qual", "quais", "quanto", "quantos", "quem", "onde", "como", "por que"
]);

export interface Chunk {
    id: string;
    text: string;
}

// Reconstrói e formata os registros do banco de dados em chunks de texto descritivos
export async function buildChunks(): Promise<Chunk[]> {
    const db = await getDb();
    const chunks: Chunk[] = [];

    // 1. Chunks de Movimentações (com fornecedor/cliente, classificações e parcelas associadas)
    const movimentacoes = await db.all(`
        SELECT 
            m.id, m.tipo as tipoMov, m.valorTotal, m.ativo,
            p.razaoSocial, p.cnpjCpf, p.tipo as tipoPessoa
        FROM MOVIMENTOCONTAS m
        LEFT JOIN PESSOAS p ON m.pessoaId = p.id
    `);

    for (const mov of movimentacoes) {
        // Classificações
        const classifs = await db.all(`
            SELECT c.descricao 
            FROM MOVIMENTOCLASSIFICACAO mc
            JOIN CLASSIFICACAO c ON mc.classificacaoId = c.id
            WHERE mc.movimentoId = ?
        `, [mov.id]);
        const categoriasStr = classifs.map(c => c.descricao).join(", ");

        // Parcelas
        const parcelas = await db.all(`
            SELECT numeroParcela, valor, dataVencimento 
            FROM PARCELACONTAS 
            WHERE movimentoId = ?
        `, [mov.id]);
        const parcelasStr = parcelas
            .map(p => `Parcela ${p.numeroParcela} vencendo em ${p.dataVencimento} no valor de R$ ${p.valor.toFixed(2)}`)
            .join("; ");

        const text = `Movimentação Financeira (ID: ${mov.id}). ` +
            `Tipo de movimentação: ${mov.tipoMov === "APAGAR" ? "Contas a Pagar" : "Contas a Receber"}. ` +
            `Valor Total do registro: R$ ${mov.valorTotal.toFixed(2)}. ` +
            `Pessoa associada: ${mov.razaoSocial} (${mov.tipoPessoa === "FORNECEDOR" ? "Fornecedor" : "Faturado/Cliente"}, CPF/CNPJ: ${mov.cnpjCpf || "Não informado"}). ` +
            `Status do registro: ${mov.ativo === 1 ? "Ativo" : "Inativo"}. ` +
            `Classificação de Despesa/Categoria: ${categoriasStr || "Nenhuma"}. ` +
            `Parcelas do pagamento: ${parcelasStr || "Nenhuma parcela registrada"}.`;

        chunks.push({
            id: `movimento_${mov.id}`,
            text
        });
    }

    // 2. Chunks de Pessoas
    const pessoas = await db.all(`SELECT id, tipo, razaoSocial, cnpjCpf, ativo FROM PESSOAS`);
    for (const p of pessoas) {
        const text = `Pessoa cadastrada no sistema (ID: ${p.id}). ` +
            `Tipo: ${p.tipo === "FORNECEDOR" ? "Fornecedor" : "Faturado/Cliente"}. ` +
            `Nome/Razão Social: ${p.razaoSocial}. ` +
            `Documento (CPF/CNPJ): ${p.cnpjCpf || "Nulo"}. ` +
            `Status do cadastro: ${p.ativo === 1 ? "Ativo" : "Inativo"}.`;
        chunks.push({
            id: `pessoa_${p.id}`,
            text
        });
    }

    // 3. Chunks de Classificações
    const classificacoes = await db.all(`SELECT id, tipo, descricao, ativo FROM CLASSIFICACAO`);
    for (const c of classificacoes) {
        const text = `Classificação/Categoria cadastrada no sistema (ID: ${c.id}). ` +
            `Tipo: ${c.tipo}. ` +
            `Descrição: ${c.descricao}. ` +
            `Status do cadastro: ${c.ativo === 1 ? "Ativo" : "Inativo"}.`;
        chunks.push({
            id: `classificacao_${c.id}`,
            text
        });
    }

    // 4. Chunks de Resumos Anuais (para responder perguntas agregadas do professor como soma anual e maior fornecedor)
    const resumoAnual = await db.all(`
        SELECT 
            m.id, m.valorTotal, p.razaoSocial,
            (SELECT MIN(substr(dataVencimento, 1, 4)) FROM PARCELACONTAS WHERE movimentoId = m.id) as ano
        FROM MOVIMENTOCONTAS m
        JOIN PESSOAS p ON m.pessoaId = p.id
        WHERE m.ativo = 1
    `);

    const anosMap = new Map<string, { total: number, fornecedores: Map<string, number> }>();
    for (const row of resumoAnual) {
        const ano = row.ano || "N/A";
        if (!anosMap.has(ano)) {
            anosMap.set(ano, { total: 0, fornecedores: new Map() });
        }
        const aData = anosMap.get(ano)!;
        aData.total += row.valorTotal;

        const fornecedor = row.razaoSocial;
        aData.fornecedores.set(fornecedor, (aData.fornecedores.get(fornecedor) || 0) + row.valorTotal);
    }

    for (const [ano, data] of anosMap.entries()) {
        if (ano === "N/A") continue;

        let maiorFornecedor = "";
        let maiorValor = 0;
        const detalhes: string[] = [];
        for (const [forn, val] of data.fornecedores.entries()) {
            detalhes.push(`${forn}: R$ ${val.toFixed(2)}`);
            if (val > maiorValor) {
                maiorValor = val;
                maiorFornecedor = forn;
            }
        }

        const text = `Resumo Anual de Notas Fiscais do Ano de ${ano}. ` +
            `O valor total pago/lançado em Notas Fiscais emitidas/vencidas no ano de ${ano} foi de R$ ${data.total.toFixed(2)}. ` +
            `O fornecedor responsável pelo maior valor nesse período (ano de ${ano}) foi ${maiorFornecedor} com o total acumulado de R$ ${maiorValor.toFixed(2)}. ` +
            `Detalhamento completo de gastos por fornecedor no ano de ${ano}: ${detalhes.join("; ")}.`;

        chunks.push({
            id: `summary_year_${ano}`,
            text
        });
    }

    return chunks;
}

// RAG Simples: Busca por correspondência de palavras-chave
export async function consultarRagSimples(pergunta: string): Promise<{ resposta: string, fontes: string[] }> {
    const chunks = await buildChunks();
    
    if (chunks.length === 0) {
        return {
            resposta: "O banco de dados está vazio. Não há registros de movimentações, pessoas ou classificações para responder à sua pergunta.",
            fontes: []
        };
    }

    // Quebra a pergunta em palavras e filtra stopwords
    const palavrasPergunta = pergunta
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOPWORDS.has(w));

    // Calcula a relevância de cada chunk com base nas palavras
    const scoredChunks = chunks.map(chunk => {
        let score = 0;
        const textLower = chunk.text.toLowerCase();
        for (const palavra of palavrasPergunta) {
            if (textLower.includes(palavra)) {
                score++;
            }
        }
        return { chunk, score };
    });

    // Filtra chunks que têm pelo menos 1 palavra de correspondência e ordena por score
    let matches = scoredChunks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.chunk);

    // Se nenhum chunk deu correspondência direta, trazemos os top 3 mais recentes como fallback
    if (matches.length === 0) {
        matches = chunks.slice(-3);
    }

    // Seleciona as top 5 fontes
    const topChunks = matches.slice(0, 5);
    const fontes = topChunks.map(c => c.text);

    // Gera a resposta combinada com Gemini
    const resposta = await gerarRespostaComLLM(pergunta, fontes, "RAG Simples (Keyword Match)");

    return {
        resposta,
        fontes
    };
}

// Função para calcular similaridade de cosseno
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// RAG Embeddings: Busca semântica por similaridade de cosseno de vetores
export async function consultarRagEmbeddings(pergunta: string): Promise<{ resposta: string, fontes: string[] }> {
    const chunks = await buildChunks();

    if (chunks.length === 0) {
        return {
            resposta: "O banco de dados está vazio. Não há registros para responder à sua pergunta.",
            fontes: []
        };
    }

    const db = await getDb();

    // 1. Sincronizar e carregar embeddings no cache do banco de dados SQLite
    const currentIds = chunks.map(c => c.id);
    
    // Obter todos os embeddings já em cache
    const cacheRows = await db.all(`SELECT id, text, embedding FROM DOCUMENT_EMBEDDINGS`);
    const cacheMap = new Map<string, { text: string, embedding: number[] }>();
    for (const row of cacheRows) {
        try {
            cacheMap.set(row.id, {
                text: row.text,
                embedding: JSON.parse(row.embedding)
            });
        } catch (e) {
            console.error(`Erro ao parsear embedding em cache do ID ${row.id}`, e);
        }
    }

    const embeddingsMap = new Map<string, number[]>();

    for (const chunk of chunks) {
        const cached = cacheMap.get(chunk.id);
        
        // Se já existir no cache e o texto for idêntico, aproveita o embedding
        if (cached && cached.text === chunk.text) {
            embeddingsMap.set(chunk.id, cached.embedding);
        } else {
            // Caso contrário, gera um novo embedding via Gemini API
            console.log(`Gerando novo embedding para: ${chunk.id}`);
            try {
                const result = await ai.models.embedContent({
                    model: "gemini-embedding-2",
                    contents: chunk.text,
                });
                
                const values = result.embeddings?.[0]?.values;
                if (values) {
                    embeddingsMap.set(chunk.id, values);
                    // Salva no banco para cache futuro
                    await db.run(`
                        INSERT OR REPLACE INTO DOCUMENT_EMBEDDINGS (id, text, embedding) 
                        VALUES (?, ?, ?)
                    `, [chunk.id, chunk.text, JSON.stringify(values)]);
                }
            } catch (err) {
                console.error(`Erro ao gerar embedding do chunk ${chunk.id}:`, err);
                // Fallback para não travar: se já tinha cache antigo, usa ele, senão pula
                if (cached) {
                    embeddingsMap.set(chunk.id, cached.embedding);
                }
            }
        }
    }

    // Limpeza do cache: Remove registros na tabela DOCUMENT_EMBEDDINGS que não estão mais nos chunks atuais
    if (currentIds.length > 0) {
        const placeholders = currentIds.map(() => "?").join(",");
        await db.run(`DELETE FROM DOCUMENT_EMBEDDINGS WHERE id NOT IN (${placeholders})`, currentIds);
    } else {
        await db.run(`DELETE FROM DOCUMENT_EMBEDDINGS`);
    }

    // 2. Obter embedding da pergunta do usuário
    let perguntaEmbedding: number[] = [];
    try {
        const result = await ai.models.embedContent({
            model: "gemini-embedding-2",
            contents: pergunta,
        });
        perguntaEmbedding = result.embeddings?.[0]?.values || [];
    } catch (err) {
        console.error("Erro ao gerar embedding da pergunta:", err);
        throw new Error("Não foi possível gerar a representação vetorial da sua pergunta. Verifique sua GEMINI_API_KEY.");
    }

    if (perguntaEmbedding.length === 0) {
        throw new Error("A API de Embeddings do Gemini retornou um vetor vazio.");
    }

    // 3. Calcular a similaridade entre a pergunta e cada chunk
    const scoredChunks = chunks.map(chunk => {
        const vec = embeddingsMap.get(chunk.id);
        const similarity = vec ? cosineSimilarity(perguntaEmbedding, vec) : 0;
        return { chunk, similarity };
    });

    // Ordena por similaridade decrescente
    const sorted = scoredChunks.sort((a, b) => b.similarity - a.similarity);
    
    // Filtra chunks relevantes (similaridade mínima, ex: 0.1, ou apenas traz os top matches)
    const topChunks = sorted.slice(0, 5).map(item => item.chunk);
    const fontes = topChunks.map(c => c.text);

    // 4. Elabora a resposta enviando o contexto para a LLM
    const resposta = await gerarRespostaComLLM(pergunta, fontes, "RAG Embeddings (Busca Semântica)");

    return {
        resposta,
        fontes
    };
}

// Envia o contexto e a pergunta para o Gemini elaborar a resposta final estruturada
async function gerarRespostaComLLM(pergunta: string, fontes: string[], metodo: string): Promise<string> {
    const contexto = fontes.length > 0
        ? fontes.map((f, i) => `[Fonte ${i + 1}]: ${f}`).join("\n\n")
        : "Nenhuma informação correspondente foi encontrada no banco de dados.";

    const prompt = `
Você é um assistente financeiro inteligente e analítico do sistema Administrativo Financeiro.
Seu objetivo é responder à pergunta do usuário baseando-se estritamente nos dados do banco de dados contidos no CONTEXTO abaixo.

Regras importantes:
1. Baseie sua resposta APENAS nos dados informados no contexto. Não invente ou presuma informações que não estão listadas.
2. Caso o contexto não contenha informações suficientes para responder à pergunta de forma precisa, diga honestamente que não encontrou essa informação nos dados registrados.
3. Elabore uma resposta amigável, clara, estruturada e profissional. Se houver valores monetários, formate-os como R$ XX,XX. Se houver datas, formate-as de forma amigável (DD/MM/AAAA).
4. Indique de forma sutil que você está usando o método de busca: "${metodo}".

CONTEXTO DO BANCO DE DADOS:
${contexto}

PERGUNTA DO USUÁRIO:
${pergunta}

Resposta:
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        if (!response.text) {
            throw new Error("Resposta da LLM veio vazia.");
        }

        return response.text;
    } catch (err: any) {
        console.error("Erro ao gerar resposta com LLM no RAG:", err);
        return `Erro ao processar resposta com a IA: ${err.message || err}`;
    }
}
