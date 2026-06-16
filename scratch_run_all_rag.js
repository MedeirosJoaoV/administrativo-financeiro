const axios = require("axios");

const queries = [
    {
        q: "Qual foi o valor total pago em Notas Fiscais emitidas no ano de 2025, e qual foi o fornecedor responsável pelo maior valor nesse período?",
        type: "simples"
    },
    {
        q: "Para o Faturado 'BELTRANO DE SOUZA' (CPF 111.111.111-11), qual é a soma total dos valores das parcelas que ainda vencerão a partir de Outubro de 2025?",
        type: "simples"
    },
    {
        q: "Existem Notas Fiscais classificadas como 'MANUTENÇÃO E OPERAÇÃO' cujos itens se assemelham a produtos usados para 'melhorar o solo', como 'corretivos' ou 'neutralizadores'?",
        type: "embeddings"
    },
    {
        q: "Qual é a despesa de 'INSUMOS AGRÍCOLAS' que tem o maior valor de Nota Fiscal total, e que tipo de 'pragas e doenças' o item se destina a combater, de acordo com o nome do produto?",
        type: "embeddings"
    },
    {
        q: "Para o Faturado 'Sementes Progresso Ltda' (CNPJ 23.456.789/0001-02), qual é a soma total dos valores das parcelas que ainda vencerão a partir de Outubro de 2025?",
        type: "simples"
    },
    {
        q: "Para o Faturado 'Sementes Progresso Ltda' (CNPJ 23.456.789/0001-02), qual é a soma total dos valores das parcelas que ainda vencerão a partir de Outubro de 2025?",
        type: "embeddings"
    }
];

async function run() {
    for (let i = 0; i < queries.length; i++) {
        const item = queries[i];
        console.log(`\n==================================================`);
        console.log(`QUERY #${i + 1} [${item.type.toUpperCase()}]: "${item.q}"`);
        try {
            const res = await axios.post("http://localhost:3000/api/notas/rag", {
                pergunta: item.q,
                tipo: item.type
            });
            console.log("\n[RESPOSTA]:");
            console.log(res.data.resposta);
            console.log("\n[FONTES MATCHED]:");
            console.log(JSON.stringify(res.data.fontes, null, 2));
        } catch (e) {
            console.error(`Erro ao rodar query #${i + 1}:`, e.response?.data || e.message);
        }
    }
}

run();
