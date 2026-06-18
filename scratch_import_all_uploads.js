const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
require("dotenv").config();

// Extracted JSONs from the log file (to avoid calling Gemini API again and hitting rate limits/errors)
const extractedNotes = [
  {
    "fornecedor": {
      "razaoSocial": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "fantasia": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "cnpj": "47.180.625/0058-81"
    },
    "faturado": {
      "nomeCompleto": "BELTRANO DE SOUZA",
      "cpf": "111.111.111-11"
    },
    "numeroNotaFiscal": "000.012.776",
    "dataEmissao": "2025-04-30",
    "descricaoProdutos": "VESSARYA BOMBONA 10L FUNGICIDA",
    "parcelas": [
      {
        "numeroParcela": 1,
        "dataVencimento": "2025-05-05",
        "valor": 163520.00
      }
    ],
    "valorTotal": 163520.00,
    "classificacoesDespesa": [
      {
        "descricao": "INSUMOS AGRÍCOLAS",
        "valor": 163520.00
      }
    ]
  },
  {
    "fornecedor": {
      "razaoSocial": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "fantasia": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "cnpj": "47.180.625/0058-81"
    },
    "faturado": {
      "nomeCompleto": "BELTRANO DE SOUZA",
      "cpf": "111.111.111-11"
    },
    "numeroNotaFiscal": "000.012.776",
    "dataEmissao": "2025-04-30",
    "descricaoProdutos": "VESSARYA BOMBONA 10L FUNGICIDA",
    "parcelas": [
      {
        "numeroParcela": 1,
        "dataVencimento": "2025-05-05",
        "valor": 163520.00
      }
    ],
    "valorTotal": 163520.00,
    "classificacoesDespesa": [
      {
        "descricao": "INSUMOS AGRÍCOLAS",
        "valor": 163520.00
      }
    ]
  },
  {
    "fornecedor": {
      "razaoSocial": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "fantasia": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "cnpj": "47.180.625/0058-81"
    },
    "faturado": {
      "nomeCompleto": "BELTRANO DE SOUZA",
      "cpf": "111.111.111-11"
    },
    "numeroNotaFiscal": "000.012.776",
    "dataEmissao": "2025-04-30",
    "descricaoProdutos": "VESSARYA BOMBONA 10L FUNGICIDA",
    "parcelas": [
      {
        "numeroParcela": 1,
        "dataVencimento": "2025-05-05",
        "valor": 163520.00
      }
    ],
    "valorTotal": 163520.00,
    "classificacoesDespesa": [
      {
        "descricao": "INSUMOS AGRÍCOLAS",
        "valor": 163520.00
      }
    ]
  },
  {
    "fornecedor": {
      "razaoSocial": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "fantasia": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "cnpj": "47.180.625/0058-81"
    },
    "faturado": {
      "nomeCompleto": "BELTRANO DE SOUZA",
      "cpf": "111.111.111-11"
    },
    "numeroNotaFiscal": "000.012.776",
    "dataEmissao": "2025-04-30",
    "descricaoProdutos": "VESSARYA BOMBONA 10L FUNGICIDA",
    "parcelas": [
      {
        "numeroParcela": 1,
        "dataVencimento": "2025-05-05",
        "valor": 163520.00
      }
    ],
    "valorTotal": 163520.00,
    "classificacoesDespesa": [
      {
        "descricao": "INSUMOS AGRÍCOLAS",
        "valor": 163520.00
      }
    ]
  },
  {
    "fornecedor": {
      "razaoSocial": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "fantasia": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "cnpj": "47.180.625/0058-81"
    },
    "faturado": {
      "nomeCompleto": "BELTRANO DE SOUZA",
      "cpf": "111.111.111-11"
    },
    "numeroNotaFiscal": "000.012.776",
    "dataEmissao": "2025-04-30",
    "descricaoProdutos": "VESSARYA BOMBONA 10L FUNGICIDA",
    "parcelas": [
      {
        "numeroParcela": 1,
        "dataVencimento": "2025-05-05",
        "valor": 163520.00
      }
    ],
    "valorTotal": 163520.00,
    "classificacoesDespesa": [
      {
        "descricao": "INSUMOS AGRÍCOLAS",
        "valor": 163520.00
      }
    ]
  },
  {
    "fornecedor": {
      "razaoSocial": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "fantasia": "CTVA PROTECAO DE CULTIVOS LTDA.",
      "cnpj": "47.180.625/0058-81"
    },
    "faturado": {
      "nomeCompleto": "BELTRANO DE SOUZA",
      "cpf": "111.111.111-11"
    },
    "numeroNotaFiscal": "000.012.776",
    "dataEmissao": "2025-04-30",
    "descricaoProdutos": "VESSARYA BOMBONA 10L FUNGICIDA",
    "parcelas": [
      {
        "numeroParcela": 1,
        "dataVencimento": "2025-05-05",
        "valor": 163520.00
      }
    ],
    "valorTotal": 163520.00,
    "classificacoesDespesa": [
      {
        "descricao": "INSUMOS AGRÍCOLAS",
        "valor": 163520.00
      }
    ]
  },
  {
    "fornecedor": {
      "razaoSocial": "RIVEMA RIO VERDE MAQUINAS AGRICOLAS E PECAS LTDA",
      "fantasia": "RIVEMA MAQUINAS AGRICOLAS",
      "cnpj": "07.225.264/0001-92"
    },
    "faturado": {
      "nomeCompleto": "BELTRANO DE SOUZA",
      "cpf": "111.111.111-11"
    },
    "numeroNotaFiscal": "000.011.111",
    "dataEmissao": "2025-01-10",
    "descricaoProdutos": "TUBO RED. 025,0X 6,0-50 NL G., KIT CABO ACO E FIXACOES, PS 12 X 80 DIN 931 10.9 ZLUZ",
    "parcelas": [
      {
        "numeroParcela": 1,
        "dataVencimento": "2025-01-10",
        "valor": 1837.18
      }
    ],
    "valorTotal": 1837.18,
    "classificacoesDespesa": [
      {
        "descricao": "MANUTENÇÃO E OPERAÇÃO",
        "valor": 1837.18
      }
    ]
  }
];

async function importAll() {
    try {
        const db = await open({
            filename: path.resolve(__dirname, "database.sqlite"),
            driver: sqlite3.Database,
        });

        console.log("=== INICIANDO IMPORTAÇÃO DAS NOTAS FISCAIS ===");
        
        for (const dados of extractedNotes) {
            // 1. Gravar/Obter Fornecedor
            let fornecedorId;
            const existingForn = await db.get("SELECT id FROM PESSOAS WHERE cnpjCpf = ? AND tipo = 'FORNECEDOR'", [dados.fornecedor.cnpj]);
            if (existingForn) {
                fornecedorId = existingForn.id;
            } else {
                const res = await db.run(
                    "INSERT INTO PESSOAS (tipo, razaoSocial, cnpjCpf) VALUES ('FORNECEDOR', ?, ?)",
                    [dados.fornecedor.razaoSocial, dados.fornecedor.cnpj]
                );
                fornecedorId = res.lastID;
                console.log(`Fornecedor cadastrado: ${dados.fornecedor.razaoSocial} (ID: ${fornecedorId})`);
            }

            // 2. Gravar/Obter Faturado
            let faturadoId;
            const existingFat = await db.get("SELECT id FROM PESSOAS WHERE cnpjCpf = ? AND tipo = 'FATURADO'", [dados.faturado.cpf]);
            if (existingFat) {
                faturadoId = existingFat.id;
            } else {
                const res = await db.run(
                    "INSERT INTO PESSOAS (tipo, razaoSocial, cnpjCpf) VALUES ('FATURADO', ?, ?)",
                    [dados.faturado.nomeCompleto, dados.faturado.cpf]
                );
                faturadoId = res.lastID;
                console.log(`Faturado cadastrado: ${dados.faturado.nomeCompleto} (ID: ${faturadoId})`);
            }

            // 3. Gravar/Obter Despesas Classificações
            let despesasIds = [];
            for (const classif of dados.classificacoesDespesa) {
                let despesaId;
                const existingClass = await db.get("SELECT id FROM CLASSIFICACAO WHERE descricao = ? AND tipo = 'DESPESA'", [classif.descricao]);
                if (existingClass) {
                    despesaId = existingClass.id;
                } else {
                    try {
                        const res = await db.run(
                            "INSERT INTO CLASSIFICACAO (tipo, descricao) VALUES ('DESPESA', ?)",
                            [classif.descricao]
                        );
                        despesaId = res.lastID;
                        console.log(`Classificação cadastrada: ${classif.descricao} (ID: ${despesaId})`);
                    } catch (e) {
                        const existing = await db.get("SELECT id FROM CLASSIFICACAO WHERE descricao = ?", [classif.descricao]);
                        despesaId = existing.id;
                    }
                }
                despesasIds.push(despesaId);
            }

            // 4. Criar MOVIMENTOCONTAS (Aqui vinculamos ao Fornecedor)
            const movimentoResult = await db.run(
                "INSERT INTO MOVIMENTOCONTAS (tipo, valorTotal, pessoaId) VALUES ('APAGAR', ?, ?)",
                [dados.valorTotal || 0, fornecedorId]
            );
            const movimentoId = movimentoResult.lastID;
            console.log(`Movimentação cadastrada ID: ${movimentoId} para Fornecedor ID: ${fornecedorId}`);

            // Associar o Movimento às classificações de Despesa
            for (const classifId of despesasIds) {
                await db.run(
                    "INSERT INTO MOVIMENTOCLASSIFICACAO (movimentoId, classificacaoId) VALUES (?, ?)",
                    [movimentoId, classifId]
                );
            }

            // 5. Criar PARCELACONTAS
            if (dados.parcelas && Array.isArray(dados.parcelas)) {
                for (const parcela of dados.parcelas) {
                    await db.run(
                        "INSERT INTO PARCELACONTAS (numeroParcela, valor, dataVencimento, movimentoId) VALUES (?, ?, ?, ?)",
                        [parcela.numeroParcela, parcela.valor, parcela.dataVencimento, movimentoId]
                    );
                    console.log(`   Parcela ${parcela.numeroParcela} cadastrada. Vencimento: ${parcela.dataVencimento}, Valor: R$ ${parcela.valor}`);
                }
            }
        }

        console.log("=== IMPORTAÇÃO CONCLUÍDA COM SUCESSO ===");

    } catch (e) {
        console.error("Erro na importação:", e);
    }
}

importAll();
