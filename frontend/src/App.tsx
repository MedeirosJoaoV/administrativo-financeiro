import { useState } from "react";
import axios from "axios";
import "./index.css";

type Parcela = {
  numeroParcela: number;
  dataVencimento: string;
  valor: number;
};

type ClassificacaoDespesa = {
  descricao: string;
  valor: number;
};

type NotaFiscal = {
  fornecedor: {
    razaoSocial: string;
    fantasia: string;
    cnpj: string;
  };
  faturado: {
    nomeCompleto: string;
    cpf: string;
  };
  numeroNotaFiscal: string;
  dataEmissao: string;
  descricaoProdutos: string;
  parcelas: Parcela[];
  valorTotal: number;
  classificacoesDespesa: ClassificacaoDespesa[];
};

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<NotaFiscal | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "json" | "analise">("visual");
  const [copied, setCopied] = useState(false);
  
  // States for Stage 2
  const [analise, setAnalise] = useState<any>(null);
  const [analisando, setAnalisando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const enviarArquivo = async () => {
    if (!file) {
      alert("Selecione um PDF primeiro.");
      return;
    }

    try {
      setLoading(true);
      setResultado(null);
      setAnalise(null);
      setSucesso(false);
      
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:3000/api/notas/upload",
        formData,
      );

      setResultado(response.data.dados);
      setActiveTab("visual");
    } catch (error: any) {
      console.error(error.response?.data || error);
      alert(
        error.response?.data?.detalhe ||
          error.response?.data?.erro ||
          "Erro ao processar o PDF.",
      );
    } finally {
      setLoading(false);
    }
  };

  const analisarNoBanco = async () => {
    if (!resultado) return;
    try {
      setAnalisando(true);
      const response = await axios.post(
        "http://localhost:3000/api/notas/analisar",
        resultado
      );
      setAnalise(response.data.analise);
      setActiveTab("analise");
    } catch (error: any) {
      alert("Erro ao consultar o banco de dados.");
    } finally {
      setAnalisando(false);
    }
  };

  const salvarNoBanco = async () => {
    if (!resultado || !analise) return;
    try {
      setSalvando(true);
      await axios.post("http://localhost:3000/api/notas/salvar", {
        dados: resultado,
        analise: analise
      });
      setSucesso(true);
      alert("REGISTRO FOI LANÇADO COM SUCESSO!");
    } catch (error: any) {
      alert("Erro ao salvar os registros no banco de dados.");
    } finally {
      setSalvando(false);
    }
  };

  const copyJSON = () => {
    if (resultado) {
      navigator.clipboard.writeText(JSON.stringify(resultado, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Extração e Integração de Notas Fiscais</h1>
        <p>Extraia os dados via IA e integre os registros no Banco de Dados</p>
      </div>

      <div className="card">
        <div className="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload do PDF
        </div>
        
        <div className="upload-section">
          {!file ? (
            <div className="file-input-wrapper">
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange} 
              />
              <span className="file-label">Escolher arquivo PDF da nota...</span>
            </div>
          ) : (
            <div className="file-selected">
              <span className="file-selected-name">{file.name}</span>
              <button 
                onClick={() => setFile(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#EF4444", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>
          )}

          <button 
            className="btn-primary" 
            onClick={enviarArquivo} 
            disabled={loading || !file}
          >
            {loading ? "Processando IA..." : "EXTRAIR DADOS"}
          </button>
        </div>
      </div>

      {resultado && (
        <div className="card">
          <div className="tabs">
            <div 
              className={`tab ${activeTab === "visual" ? "active" : "inactive"}`}
              onClick={() => setActiveTab("visual")}
            >
              Visualização Formatada
            </div>
            <div 
              className={`tab ${activeTab === "json" ? "active" : "inactive"}`}
              onClick={() => setActiveTab("json")}
            >
              JSON
            </div>
            <div 
              className={`tab ${activeTab === "analise" ? "active" : "inactive"}`}
              onClick={analisarNoBanco}
              style={{ backgroundColor: activeTab === "analise" ? "#EFF6FF" : "", color: activeTab === "analise" ? "#2563EB" : "" }}
            >
              {analisando ? "Consultando..." : "Análise do Banco"}
            </div>
          </div>

          {activeTab === "visual" && (
            <div className="format-view">
              <div className="format-box">
                <h3>Fornecedor</h3>
                <div className="format-item">
                  <span className="format-label">Nome Fantasia</span>
                  <span className="format-value">{resultado.fornecedor.fantasia || resultado.fornecedor.razaoSocial}</span>
                </div>
                <div className="format-item">
                  <span className="format-label">CNPJ</span>
                  <span className="format-value">{resultado.fornecedor.cnpj}</span>
                </div>
              </div>
              
              <div className="format-box">
                <h3>Faturado (Cliente)</h3>
                <div className="format-item">
                  <span className="format-label">Nome Completo</span>
                  <span className="format-value">{resultado.faturado.nomeCompleto}</span>
                </div>
                <div className="format-item">
                  <span className="format-label">CPF / CNPJ</span>
                  <span className="format-value">{resultado.faturado.cpf}</span>
                </div>
              </div>

              <div className="format-box">
                <h3>Dados da Nota e Classificação</h3>
                <div className="format-item">
                  <span className="format-label">Número / Emissão</span>
                  <span className="format-value">{resultado.numeroNotaFiscal} - {resultado.dataEmissao}</span>
                </div>
                <div className="format-item">
                  <span className="format-label">Valor Total</span>
                  <span className="format-value">R$ {resultado.valorTotal}</span>
                </div>
                {resultado.classificacoesDespesa.map((cat, i) => (
                  <div className="format-item" key={i}>
                    <span className="format-label">Classificação sugerida</span>
                    <span className="format-value" style={{ color: "var(--primary-color)" }}>{cat.descricao}</span>
                  </div>
                ))}
              </div>

              <div className="format-box" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <button className="btn-primary" onClick={analisarNoBanco} style={{ backgroundColor: "#2563EB" }}>
                  AVANÇAR PARA INTEGRAÇÃO
                </button>
              </div>
            </div>
          )}

          {activeTab === "json" && (
            <div>
              <div className="json-view-header">
                <div className="json-title">Dados Extraídos</div>
                <button className="btn-copy" onClick={copyJSON}>
                  {copied ? "Copiado!" : "Copiar JSON"}
                </button>
              </div>
              <div className="json-container">
                <pre>{JSON.stringify(resultado, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === "analise" && analise && (
            <div className="analise-view">
              <h2 style={{ fontSize: "18px", marginBottom: "20px" }}>Resultado da Consulta no Banco</h2>
              
              <div className="analise-card">
                <strong>FORNECEDOR</strong><br/>
                {analise.fornecedor.nome}<br/>
                CNPJ: {analise.fornecedor.documento}<br/>
                <span className={analise.fornecedor.existe ? "status-existe" : "status-nao-existe"}>
                  {analise.fornecedor.existe ? `EXISTE – ID: ${analise.fornecedor.id}` : "NÃO EXISTE"}
                </span>
              </div>

              <div className="analise-card">
                <strong>FATURADO</strong><br/>
                {analise.faturado.nome}<br/>
                CPF/CNPJ: {analise.faturado.documento}<br/>
                <span className={analise.faturado.existe ? "status-existe" : "status-nao-existe"}>
                  {analise.faturado.existe ? `EXISTE – ID: ${analise.faturado.id}` : "NÃO EXISTE"}
                </span>
              </div>

              {analise.despesas.map((desp: any, idx: number) => (
                <div className="analise-card" key={idx}>
                  <strong>DESPESA</strong><br/>
                  {desp.descricao}<br/>
                  <span className={desp.existe ? "status-existe" : "status-nao-existe"}>
                    {desp.existe ? `EXISTE – ID: ${desp.id}` : "NÃO EXISTE"}
                  </span>
                </div>
              ))}

              <div style={{ marginTop: "24px" }}>
                {sucesso ? (
                  <div style={{ padding: "16px", backgroundColor: "#D1FAE5", color: "#065F46", borderRadius: "8px", textAlign: "center", fontWeight: "bold" }}>
                    ✓ REGISTRO FOI LANÇADO COM SUCESSO!
                  </div>
                ) : (
                  <button className="btn-primary" onClick={salvarNoBanco} disabled={salvando} style={{ backgroundColor: "#10B981" }}>
                    {salvando ? "Salvando..." : "CRIAR REGISTROS NO SISTEMA"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
