import axios from "axios";

async function run() {
    try {
        const pergunta = "Qual foi o valor total pago em Notas Fiscais emitidas no ano de 2025, e qual foi o fornecedor responsável pelo maior valor nesse período?";
        
        console.log("=== TESTING RAG SIMPLES ===");
        const responseSimples = await axios.post("http://localhost:3000/api/notas/rag", {
            pergunta: pergunta,
            tipo: "simples"
        });
        console.log(responseSimples.data.resposta);
        console.log("\n=== SOURCES MATCHED (SIMPLES) ===");
        console.log(responseSimples.data.fontes);

        console.log("\n=== TESTING RAG EMBEDDINGS ===");
        const responseEmbeddings = await axios.post("http://localhost:3000/api/notas/rag", {
            pergunta: pergunta,
            tipo: "embeddings"
        });
        console.log(responseEmbeddings.data.resposta);
        console.log("\n=== SOURCES MATCHED (EMBEDDINGS) ===");
        console.log(responseEmbeddings.data.fontes);

    } catch (e: any) {
        console.error("Error testing RAG:", e.response?.data || e.message);
    }
}
run();
