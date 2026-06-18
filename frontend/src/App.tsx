import { useState, useEffect } from "react";
import axios from "axios";
import "./index.css";

// --- Types ---
type Pessoa = {
  id: number;
  tipo: string; // FORNECEDOR, CLIENTE, FATURADO
  razaoSocial: string;
  cnpjCpf: string | null;
  ativo: number;
};

type Classificacao = {
  id: number;
  tipo: string; // RECEITA, DESPESA
  descricao: string;
  ativo: number;
};

type Parcela = {
  id?: number;
  numeroParcela: number;
  dataVencimento: string;
  valor: number;
};

type Conta = {
  id: number;
  tipo: string; // APAGAR, ARECEBER
  valorTotal: number;
  pessoaId: number;
  pessoaNome?: string;
  pessoaDocumento?: string;
  pessoaTipo?: string;
  ativo: number;
  classificacoes: Classificacao[];
  parcelas: Parcela[];
};

// Types for Stage 1/2
type ExtractedParcela = {
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
  parcelas: ExtractedParcela[];
  valorTotal: number;
  classificacoesDespesa: ClassificacaoDespesa[];
};

function App() {
  const [activeTab, setActiveTab] = useState<"contas" | "pessoas" | "classificacoes" | "upload" | "rag">("contas");

  // --- Global Dropdown Cache for Contas Form ---
  const [dropdownPessoas, setDropdownPessoas] = useState<Pessoa[]>([]);
  const [dropdownClassificacoes, setDropdownClassificacoes] = useState<Classificacao[]>([]);

  // Function to refresh dropdown lists (loads active ones)
  const refreshDropdowns = async () => {
    try {
      const resP = await axios.get("/api/pessoas?todos=true");
      setDropdownPessoas(resP.data);
      const resC = await axios.get("/api/classificacoes?todos=true");
      setDropdownClassificacoes(resC.data);
    } catch (error) {
      console.error("Erro ao carregar listas auxiliares:", error);
    }
  };

  useEffect(() => {
    refreshDropdowns();
  }, []);

  // ==========================================
  // 👥 SEÇÃO: MANTER PESSOAS
  // ==========================================
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [pessoasSearch, setPessoasSearch] = useState("");
  const [pessoasSortCol, setPessoasSortCol] = useState("id");
  const [pessoasSortOrder, setPessoasSortOrder] = useState<"asc" | "desc">("asc");
  const [showPessoaForm, setShowPessoaForm] = useState(false);
  const [isEditingPessoa, setIsEditingPessoa] = useState(false);
  const [pessoaForm, setPessoaForm] = useState({
    id: undefined as number | undefined,
    tipo: "FORNECEDOR",
    razaoSocial: "",
    cnpjCpf: "",
  });

  const handlePessoasSort = (colName: string) => {
    const nextOrder = (pessoasSortCol === colName && pessoasSortOrder === "asc") ? "desc" : "asc";
    setPessoasSortCol(colName);
    setPessoasSortOrder(nextOrder);
    if (pessoas) {
      // Re-trigger fetch to maintain sort
      fetchPessoas(false, colName, nextOrder);
    }
  };

  const fetchPessoas = async (all = false, col = pessoasSortCol, order = pessoasSortOrder) => {
    try {
      let url = `/api/pessoas?sortBy=${col}&sortOrder=${order}`;
      if (all) {
        url += "&todos=true";
      } else if (pessoasSearch.trim()) {
        url += `&busca=${encodeURIComponent(pessoasSearch)}`;
      } else {
        alert("Digite um termo para busca ou clique em TODOS.");
        return;
      }
      const res = await axios.get(url);
      setPessoas(res.data);
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao carregar pessoas.");
    }
  };

  const savePessoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoaForm.razaoSocial.trim()) {
      alert("Por favor, informe a Razão Social/Nome.");
      return;
    }
    try {
      if (isEditingPessoa && pessoaForm.id) {
        await axios.put(`/api/pessoas/${pessoaForm.id}`, {
          tipo: pessoaForm.tipo,
          razaoSocial: pessoaForm.razaoSocial,
          cnpjCpf: pessoaForm.cnpjCpf || null,
        });
        alert("Pessoa atualizada com sucesso!");
      } else {
        await axios.post("/api/pessoas", {
          tipo: pessoaForm.tipo,
          razaoSocial: pessoaForm.razaoSocial,
          cnpjCpf: pessoaForm.cnpjCpf || null,
        });
        alert("Pessoa cadastrada com sucesso!");
      }
      setShowPessoaForm(false);
      resetPessoaForm();
      fetchPessoas(true); // reload list
      refreshDropdowns();
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao salvar pessoa.");
    }
  };

  const deletePessoa = async (id: number) => {
    if (!window.confirm("Deseja realmente inativar este registro?")) return;
    try {
      await axios.delete(`/api/pessoas/${id}`);
      alert("Registro inativado com sucesso!");
      fetchPessoas(true); // reload active list
      refreshDropdowns();
    } catch (error: any) {
      alert("Erro ao inativar registro.");
    }
  };

  const openEditPessoa = (p: Pessoa) => {
    setPessoaForm({
      id: p.id,
      tipo: p.tipo,
      razaoSocial: p.razaoSocial,
      cnpjCpf: p.cnpjCpf || "",
    });
    setIsEditingPessoa(true);
    setShowPessoaForm(true);
  };

  const resetPessoaForm = () => {
    setPessoaForm({ id: undefined, tipo: "FORNECEDOR", razaoSocial: "", cnpjCpf: "" });
    setIsEditingPessoa(false);
  };

  // ==========================================
  // 🏷️ SEÇÃO: MANTER CLASSIFICAÇÕES
  // ==========================================
  const [classificacoes, setClassificacoes] = useState<Classificacao[] | null>(null);
  const [classificacoesSearch, setClassificacoesSearch] = useState("");
  const [classificacoesSortCol, setClassificacoesSortCol] = useState("id");
  const [classificacoesSortOrder, setClassificacoesSortOrder] = useState<"asc" | "desc">("asc");
  const [showClassificacaoForm, setShowClassificacaoForm] = useState(false);
  const [isEditingClassificacao, setIsEditingClassificacao] = useState(false);
  const [classificacaoForm, setClassificacaoForm] = useState({
    id: undefined as number | undefined,
    tipo: "DESPESA",
    descricao: "",
  });

  const handleClassSort = (colName: string) => {
    const nextOrder = (classificacoesSortCol === colName && classificacoesSortOrder === "asc") ? "desc" : "asc";
    setClassificacoesSortCol(colName);
    setClassificacoesSortOrder(nextOrder);
    if (classificacoes) {
      fetchClassificacoes(false, colName, nextOrder);
    }
  };

  const fetchClassificacoes = async (all = false, col = classificacoesSortCol, order = classificacoesSortOrder) => {
    try {
      let url = `/api/classificacoes?sortBy=${col}&sortOrder=${order}`;
      if (all) {
        url += "&todos=true";
      } else if (classificacoesSearch.trim()) {
        url += `&busca=${encodeURIComponent(classificacoesSearch)}`;
      } else {
        alert("Digite um termo para busca ou clique em TODOS.");
        return;
      }
      const res = await axios.get(url);
      setClassificacoes(res.data);
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao carregar classificações.");
    }
  };

  const saveClassificacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classificacaoForm.descricao.trim()) {
      alert("Por favor, informe a descrição.");
      return;
    }
    try {
      if (isEditingClassificacao && classificacaoForm.id) {
        await axios.put(`/api/classificacoes/${classificacaoForm.id}`, {
          tipo: classificacaoForm.tipo,
          descricao: classificacaoForm.descricao,
        });
        alert("Classificação atualizada com sucesso!");
      } else {
        await axios.post("/api/classificacoes", {
          tipo: classificacaoForm.tipo,
          descricao: classificacaoForm.descricao,
        });
        alert("Classificação cadastrada com sucesso!");
      }
      setShowClassificacaoForm(false);
      resetClassificacaoForm();
      fetchClassificacoes(true);
      refreshDropdowns();
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao salvar classificação.");
    }
  };

  const deleteClassificacao = async (id: number) => {
    if (!window.confirm("Deseja realmente inativar esta classificação?")) return;
    try {
      await axios.delete(`/api/classificacoes/${id}`);
      alert("Classificação inativada com sucesso!");
      fetchClassificacoes(true);
      refreshDropdowns();
    } catch (error: any) {
      alert("Erro ao inativar classificação.");
    }
  };

  const openEditClassificacao = (c: Classificacao) => {
    setClassificacaoForm({
      id: c.id,
      tipo: c.tipo,
      descricao: c.descricao,
    });
    setIsEditingClassificacao(true);
    setShowClassificacaoForm(true);
  };

  const resetClassificacaoForm = () => {
    setClassificacaoForm({ id: undefined, tipo: "DESPESA", descricao: "" });
    setIsEditingClassificacao(false);
  };

  // ==========================================
  // 📑 SEÇÃO: MANTER CONTAS
  // ==========================================
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [contasSearch, setContasSearch] = useState("");
  const [contasSortCol, setContasSortCol] = useState("id");
  const [contasSortOrder, setContasSortOrder] = useState<"asc" | "desc">("asc");
  const [showContaForm, setShowContaForm] = useState(false);
  const [isEditingConta, setIsEditingConta] = useState(false);
  const [viewingParcelasConta, setViewingParcelasConta] = useState<Conta | null>(null);

  // Conta Form State
  const [contaForm, setContaForm] = useState({
    id: undefined as number | undefined,
    tipo: "APAGAR", // APAGAR ou ARECEBER
    valorTotal: 0,
    pessoaId: "",
    classificacoesIds: [] as number[],
    parcelas: [] as Parcela[],
  });

  const handleContasSort = (colName: string) => {
    const nextOrder = (contasSortCol === colName && contasSortOrder === "asc") ? "desc" : "asc";
    setContasSortCol(colName);
    setContasSortOrder(nextOrder);
    if (contas) {
      fetchContas(false, colName, nextOrder);
    }
  };

  const fetchContas = async (all = false, col = contasSortCol, order = contasSortOrder) => {
    try {
      let url = `/api/contas?sortBy=${col}&sortOrder=${order}`;
      if (all) {
        url += "&todos=true";
      } else if (contasSearch.trim()) {
        url += `&busca=${encodeURIComponent(contasSearch)}`;
      } else {
        alert("Digite um termo para busca ou clique em TODOS.");
        return;
      }
      const res = await axios.get(url);
      setContas(res.data);
    } catch (error: any) {
      alert("Erro ao carregar contas.");
    }
  };

  const addParcelaForm = () => {
    const num = contaForm.parcelas.length + 1;
    const today = new Date();
    today.setDate(today.getDate() + 30 * num);
    const dateStr = today.toISOString().split("T")[0];

    setContaForm(prev => ({
      ...prev,
      parcelas: [
        ...prev.parcelas,
        { numeroParcela: num, valor: 0, dataVencimento: dateStr }
      ]
    }));
  };

  const removeParcelaForm = (index: number) => {
    const updated = contaForm.parcelas.filter((_, idx) => idx !== index)
      .map((p, idx) => ({ ...p, numeroParcela: idx + 1 })); // recalculate numbers
    setContaForm(prev => ({ ...prev, parcelas: updated }));
  };

  const handleParcelaChange = (index: number, field: keyof Parcela, val: any) => {
    const updated = [...contaForm.parcelas];
    updated[index] = { ...updated[index], [field]: val };
    setContaForm(prev => ({ ...prev, parcelas: updated }));
  };

  const autoGenerateParcelas = () => {
    if (contaForm.valorTotal <= 0) {
      alert("Informe o Valor Total antes de gerar parcelas.");
      return;
    }
    const countStr = prompt("Quantas parcelas deseja gerar?", "1");
    const count = parseInt(countStr || "1", 10);
    if (isNaN(count) || count < 1) {
      alert("Informe uma quantidade válida.");
      return;
    }

    const valorBase = Math.round((contaForm.valorTotal / count) * 100) / 100;
    let restante = contaForm.valorTotal;
    const novasParcelas: Parcela[] = [];

    for (let i = 1; i <= count; i++) {
      let v = valorBase;
      if (i === count) {
        v = Math.round(restante * 100) / 100;
      }
      restante -= v;

      const vDate = new Date();
      vDate.setDate(vDate.getDate() + 30 * i);
      const dataVencimento = vDate.toISOString().split("T")[0];

      novasParcelas.push({
        numeroParcela: i,
        valor: v,
        dataVencimento
      });
    }

    setContaForm(prev => ({ ...prev, parcelas: novasParcelas }));
  };

  const toggleClassifSelect = (id: number) => {
    setContaForm(prev => {
      const exists = prev.classificacoesIds.includes(id);
      const updated = exists
        ? prev.classificacoesIds.filter(cid => cid !== id)
        : [...prev.classificacoesIds, id];
      return { ...prev, classificacoesIds: updated };
    });
  };

  const saveConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaForm.pessoaId) {
      alert("Por favor, selecione uma Pessoa.");
      return;
    }
    if (contaForm.valorTotal <= 0) {
      alert("Informe um valor total válido.");
      return;
    }

    // Validação da soma das parcelas
    const sumParcelas = contaForm.parcelas.reduce((acc, p) => acc + Number(p.valor), 0);
    const sumParcelasRounded = Math.round(sumParcelas * 100) / 100;
    const valorTotalRounded = Math.round(contaForm.valorTotal * 100) / 100;

    if (contaForm.parcelas.length > 0 && sumParcelasRounded !== valorTotalRounded) {
      alert(`Aviso: A soma das parcelas (R$ ${sumParcelasRounded.toFixed(2)}) difere do valor total da conta (R$ ${valorTotalRounded.toFixed(2)}).`);
      return;
    }

    try {
      const payload = {
        tipo: contaForm.tipo,
        valorTotal: contaForm.valorTotal,
        pessoaId: Number(contaForm.pessoaId),
        classificacoesIds: contaForm.classificacoesIds,
        parcelas: contaForm.parcelas,
      };

      if (isEditingConta && contaForm.id) {
        await axios.put(`/api/contas/${contaForm.id}`, payload);
        alert("Conta atualizada com sucesso!");
      } else {
        await axios.post("/api/contas", payload);
        alert("Conta lançada com sucesso!");
      }

      setShowContaForm(false);
      resetContaForm();
      fetchContas(true);
    } catch (error: any) {
      alert(error.response?.data?.erro || "Erro ao salvar a conta.");
    }
  };

  const deleteConta = async (id: number) => {
    if (!window.confirm("Deseja realmente inativar esta conta?")) return;
    try {
      await axios.delete(`/api/contas/${id}`);
      alert("Conta inativada com sucesso!");
      fetchContas(true);
    } catch (error: any) {
      alert("Erro ao inativar conta.");
    }
  };

  const openEditConta = (c: Conta) => {
    setContaForm({
      id: c.id,
      tipo: c.tipo,
      valorTotal: c.valorTotal,
      pessoaId: String(c.pessoaId),
      classificacoesIds: c.classificacoes.map(cl => cl.id),
      parcelas: c.parcelas.map(p => ({
        numeroParcela: p.numeroParcela,
        valor: p.valor,
        dataVencimento: p.dataVencimento
      })),
    });
    setIsEditingConta(true);
    setShowContaForm(true);
  };

  const resetContaForm = () => {
    setContaForm({
      id: undefined,
      tipo: "APAGAR",
      valorTotal: 0,
      pessoaId: "",
      classificacoesIds: [],
      parcelas: [],
    });
    setIsEditingConta(false);
  };

  // ==========================================
  // 📂 SEÇÃO: EXTRAÇÃO IA (UPLOAD DE NOTAS)
  // ==========================================
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<NotaFiscal | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadTab, setUploadTab] = useState<"visual" | "json" | "analise">("visual");
  const [copied, setCopied] = useState(false);
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

      const response = await axios.post("/api/notas/upload", formData);
      setResultado(response.data.dados);
      setUploadTab("visual");
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.detalhe || error.response?.data?.erro || "Erro ao processar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  const analisarNoBanco = async () => {
    if (!resultado) return;
    try {
      setAnalisando(true);
      const response = await axios.post("/api/notas/analisar", resultado);
      setAnalise(response.data.analise);
      setUploadTab("analise");
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
      await axios.post("/api/notas/salvar", {
        dados: resultado,
        analise: analise
      });
      setSucesso(true);
      alert("REGISTRO FOI LANÇADO COM SUCESSO!");
      refreshDropdowns();
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

  // ==========================================
  // 🔍 SEÇÃO: AGENTE RAG
  // ==========================================
  const [ragPergunta, setRagPergunta] = useState("");
  const [ragTipo, setRagTipo] = useState<"simples" | "embeddings">("embeddings");
  const [ragResposta, setRagResposta] = useState("");
  const [ragFontes, setRagFontes] = useState<string[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [showFontes, setShowFontes] = useState(false);

  const enviarConsultaRAG = async () => {
    if (!ragPergunta.trim()) {
      alert("Por favor, digite uma pergunta.");
      return;
    }
    try {
      setRagLoading(true);
      setRagResposta("");
      setRagFontes([]);
      setShowFontes(false);

      const response = await axios.post("/api/notas/rag", {
        pergunta: ragPergunta,
        tipo: ragTipo
      });

      if (response.data.sucesso) {
        setRagResposta(response.data.resposta);
        setRagFontes(response.data.fontes || []);
      }
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.erro || error.response?.data?.detalhe || "Erro ao consultar o banco com RAG.");
    } finally {
      setRagLoading(false);
    }
  };

  const formatLLMResponse = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, index) => {
      let trimmed = line.trim();
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const content = trimmed.substring(2);
        return (
          <li key={index} style={{ marginLeft: "20px", marginBottom: "6px" }}
              dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
        );
      }
      if (trimmed === "") {
        return <div key={index} style={{ height: "10px" }} />;
      }
      return (
        <p key={index} style={{ marginBottom: "8px", lineHeight: "1.6" }}
           dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      );
    });
  };

  return (
    <div className="app-container">
      {/* Sidebar / Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <h2>FinançaAdmin</h2>
          <span className="badge-logo">V4.0 - RAG</span>
        </div>
        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === "contas" ? "active" : ""}`}
            onClick={() => { setActiveTab("contas"); setContas(null); }}
          >
            📑 Contas a Pagar/Receber
          </button>
          <button 
            className={`nav-item ${activeTab === "pessoas" ? "active" : ""}`}
            onClick={() => { setActiveTab("pessoas"); setPessoas(null); }}
          >
            👥 Manter Pessoas
          </button>
          <button 
            className={`nav-item ${activeTab === "classificacoes" ? "active" : ""}`}
            onClick={() => { setActiveTab("classificacoes"); setClassificacoes(null); }}
          >
            🏷️ Classificações
          </button>
          <button 
            className={`nav-item ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            📂 Importar Notas (IA)
          </button>
          <button 
            className={`nav-item ${activeTab === "rag" ? "active" : ""}`}
            onClick={() => setActiveTab("rag")}
          >
            🔍 Agente Inteligente RAG
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="main-header">
          <h1>
            {activeTab === "contas" && "📑 Gestão de Contas a Pagar e Receber"}
            {activeTab === "pessoas" && "👥 Cadastro Geral de Pessoas"}
            {activeTab === "classificacoes" && "🏷️ Classificação de Receitas e Despesas"}
            {activeTab === "upload" && "📂 Integração Automática de Notas"}
            {activeTab === "rag" && "🔍 Assistente de Negócios Inteligente (RAG)"}
          </h1>
          <p>
            {activeTab === "contas" && "Gerencie lançamentos financeiros, vencimentos e conciliações."}
            {activeTab === "pessoas" && "Gerencie Fornecedores, Clientes e Faturados cadastrados."}
            {activeTab === "classificacoes" && "Organize categorias para fluxos de despesa e receita."}
            {activeTab === "upload" && "Envie notas fiscais em formato PDF para que a IA cadastre automaticamente."}
            {activeTab === "rag" && "Converse com o banco de dados em linguagem natural."}
          </p>
        </header>

        {/* ==================== TAB: CONTAS ==================== */}
        {activeTab === "contas" && (
          <div className="section-card">
            {/* Search and Action Toolbar */}
            <div className="toolbar">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar por tipo, nome da pessoa ou categoria..." 
                  value={contasSearch}
                  onChange={(e) => setContasSearch(e.target.value)}
                />
                <button className="btn-action btn-blue" onClick={() => fetchContas(false)}>Buscar</button>
                <button className="btn-action btn-slate" onClick={() => fetchContas(true)}>TODOS (Ativos)</button>
              </div>
              <button className="btn-action btn-green" onClick={() => { resetContaForm(); setShowContaForm(true); }}>
                + Nova Conta
              </button>
            </div>

            {/* Conta Creation/Edition Section */}
            {showContaForm && (
              <div className="modal-overlay">
                <div className="modal-container">
                  <div className="modal-header">
                    <h2>{isEditingConta ? "Editar Lançamento" : "Lançar Nova Conta"}</h2>
                    <button className="close-btn" onClick={() => setShowContaForm(false)}>✕</button>
                  </div>
                  <form onSubmit={saveConta} className="modal-form">
                    <div className="form-group">
                      <label>Tipo de Conta</label>
                      <select 
                        value={contaForm.tipo} 
                        onChange={(e) => setContaForm(prev => ({ ...prev, tipo: e.target.value }))}
                      >
                        <option value="APAGAR">Contas a Pagar (APAGAR)</option>
                        <option value="ARECEBER">Contas a Receber (ARECEBER)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Pessoa Associada (Fornecedor / Cliente)</label>
                      <select 
                        value={contaForm.pessoaId}
                        onChange={(e) => setContaForm(prev => ({ ...prev, pessoaId: e.target.value }))}
                      >
                        <option value="">-- Selecione uma Pessoa --</option>
                        {dropdownPessoas.map(p => (
                          <option key={p.id} value={p.id}>
                            [{p.tipo}] {p.razaoSocial} ({p.cnpjCpf || "Sem doc"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Valor Total (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={contaForm.valorTotal || ""}
                        onChange={(e) => setContaForm(prev => ({ ...prev, valorTotal: Number(e.target.value) }))}
                      />
                    </div>

                    <div className="form-group">
                      <label>Classificações / Categorias (Selecione uma ou mais)</label>
                      <div className="categories-checkbox-grid">
                        {dropdownClassificacoes.map(c => (
                          <label key={c.id} className={`checkbox-badge ${contaForm.classificacoesIds.includes(c.id) ? "checked" : ""}`}>
                            <input 
                              type="checkbox"
                              checked={contaForm.classificacoesIds.includes(c.id)}
                              onChange={() => toggleClassifSelect(c.id)}
                            />
                            <span>{c.descricao} ({c.tipo})</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Parcelas Section */}
                    <div className="form-group parcelas-form-section">
                      <div className="parcelas-header">
                        <h3>Parcelas / Pagamentos</h3>
                        <div className="parcela-actions">
                          <button type="button" className="btn-small btn-blue" onClick={autoGenerateParcelas}>
                            Auto-Gerar
                          </button>
                          <button type="button" className="btn-small btn-slate" onClick={addParcelaForm}>
                            + Adicionar Parcela
                          </button>
                        </div>
                      </div>

                      {contaForm.parcelas.length === 0 ? (
                        <p className="no-records-info">Nenhuma parcela cadastrada. Esta conta terá pagamento único implícito ou adicione parcelas.</p>
                      ) : (
                        <div className="parcelas-grid-container">
                          {contaForm.parcelas.map((p, idx) => (
                            <div key={idx} className="parcela-row">
                              <span className="parcela-index">#{p.numeroParcela}</span>
                              <div className="parcela-input">
                                <label>Vencimento</label>
                                <input 
                                  type="date" 
                                  value={p.dataVencimento}
                                  onChange={(e) => handleParcelaChange(idx, "dataVencimento", e.target.value)}
                                />
                              </div>
                              <div className="parcela-input">
                                <label>Valor (R$)</label>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  value={p.valor || ""}
                                  onChange={(e) => handleParcelaChange(idx, "valor", Number(e.target.value))}
                                  placeholder="0.00"
                                />
                              </div>
                              <button type="button" className="remove-row-btn" onClick={() => removeParcelaForm(idx)}>
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn-action btn-slate" onClick={() => setShowContaForm(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn-action btn-green">
                        {isEditingConta ? "Salvar Alterações" : "Criar Lançamento"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* List Table */}
            {contas === null ? (
              <div className="empty-state">
                <p>Nenhum dado carregado. Utilize os botões de Busca ou TODOS para trazer registros.</p>
              </div>
            ) : contas.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma conta ativa encontrada com os critérios fornecidos.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th onClick={() => handleContasSort("id")} className="sortable">
                        ID {contasSortCol === "id" && (contasSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleContasSort("tipo")} className="sortable">
                        Tipo {contasSortCol === "tipo" && (contasSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleContasSort("pessoaNome")} className="sortable">
                        Pessoa {contasSortCol === "pessoaNome" && (contasSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleContasSort("valorTotal")} className="sortable">
                        Valor Total {contasSortCol === "valorTotal" && (contasSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th>Classificações</th>
                      <th>Parcelas</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contas.map((c, index) => (
                      <tr key={c.id}>
                        <td>{index + 1}</td>
                        <td><strong>{c.id}</strong></td>
                        <td>
                          <span className={`badge ${c.tipo === "APAGAR" ? "badge-danger" : "badge-success"}`}>
                            {c.tipo === "APAGAR" ? "A Pagar" : "A Receber"}
                          </span>
                        </td>
                        <td>{c.pessoaNome} ({c.pessoaTipo})</td>
                        <td><strong>R$ {c.valorTotal.toFixed(2)}</strong></td>
                        <td>
                          <div className="categories-list">
                            {c.classificacoes.map(cl => (
                              <span key={cl.id} className="badge badge-slate">
                                {cl.descricao}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button 
                            className="btn-link"
                            onClick={() => setViewingParcelasConta(c)}
                          >
                            Ver ({c.parcelas.length})
                          </button>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="btn-small btn-blue" onClick={() => openEditConta(c)}>
                              Editar
                            </button>
                            <button className="btn-small btn-danger" onClick={() => deleteConta(c.id)}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Submodal to view parcelas */}
            {viewingParcelasConta && (
              <div className="modal-overlay">
                <div className="modal-container" style={{ maxWidth: "500px" }}>
                  <div className="modal-header">
                    <h2>Parcelas - Movimento #{viewingParcelasConta.id}</h2>
                    <button className="close-btn" onClick={() => setViewingParcelasConta(null)}>✕</button>
                  </div>
                  <div className="viewing-parcelas-body">
                    <p style={{ marginBottom: "16px", fontSize: "14px" }}>
                      <strong>Pessoa:</strong> {viewingParcelasConta.pessoaNome}<br/>
                      <strong>Valor Total do Lançamento:</strong> R$ {viewingParcelasConta.valorTotal.toFixed(2)}
                    </p>
                    <table className="custom-table" style={{ fontSize: "13px" }}>
                      <thead>
                        <tr>
                          <th>N° Parcela</th>
                          <th>Data Vencimento</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingParcelasConta.parcelas.map(p => (
                          <tr key={p.id || p.numeroParcela}>
                            <td>Parcela {p.numeroParcela}</td>
                            <td>{p.dataVencimento.split("-").reverse().join("/")}</td>
                            <td><strong>R$ {p.valor.toFixed(2)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: PESSOAS ==================== */}
        {activeTab === "pessoas" && (
          <div className="section-card">
            {/* Search and Toolbar */}
            <div className="toolbar">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar por nome, CPF/CNPJ ou tipo..." 
                  value={pessoasSearch}
                  onChange={(e) => setPessoasSearch(e.target.value)}
                />
                <button className="btn-action btn-blue" onClick={() => fetchPessoas(false)}>Buscar</button>
                <button className="btn-action btn-slate" onClick={() => fetchPessoas(true)}>TODOS (Ativos)</button>
              </div>
              <button className="btn-action btn-green" onClick={() => { resetPessoaForm(); setShowPessoaForm(true); }}>
                + Nova Pessoa
              </button>
            </div>

            {/* Creation Form Modal */}
            {showPessoaForm && (
              <div className="modal-overlay">
                <div className="modal-container" style={{ maxWidth: "450px" }}>
                  <div className="modal-header">
                    <h2>{isEditingPessoa ? "Editar Pessoa" : "Cadastrar Pessoa"}</h2>
                    <button className="close-btn" onClick={() => setShowPessoaForm(false)}>✕</button>
                  </div>
                  <form onSubmit={savePessoa} className="modal-form">
                    <div className="form-group">
                      <label>Tipo de Vínculo</label>
                      <select 
                        value={pessoaForm.tipo}
                        onChange={(e) => setPessoaForm(prev => ({ ...prev, tipo: e.target.value }))}
                      >
                        <option value="FORNECEDOR">Fornecedor (FORNECEDOR)</option>
                        <option value="CLIENTE">Cliente (CLIENTE)</option>
                        <option value="FATURADO">Faturado (FATURADO)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Nome / Razão Social</label>
                      <input 
                        type="text"
                        placeholder="Razão Social ou Nome Completo"
                        value={pessoaForm.razaoSocial}
                        onChange={(e) => setPessoaForm(prev => ({ ...prev, razaoSocial: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label>CPF / CNPJ</label>
                      <input 
                        type="text"
                        placeholder="Ex: 00.000.000/0001-00 ou 000.000.000-00"
                        value={pessoaForm.cnpjCpf}
                        onChange={(e) => setPessoaForm(prev => ({ ...prev, cnpjCpf: e.target.value }))}
                      />
                    </div>

                    {/* STATUS is logically hidden (defaults to ATIVO Internally on create and preserved on update) */}

                    <div className="modal-footer">
                      <button type="button" className="btn-action btn-slate" onClick={() => setShowPessoaForm(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn-action btn-green">
                        {isEditingPessoa ? "Salvar Alterações" : "Cadastrar"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* List Table */}
            {pessoas === null ? (
              <div className="empty-state">
                <p>Nenhum dado carregado. Utilize os botões de Busca ou TODOS para trazer registros.</p>
              </div>
            ) : pessoas.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma pessoa ativa encontrada.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th onClick={() => handlePessoasSort("id")} className="sortable">
                        ID {pessoasSortCol === "id" && (pessoasSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handlePessoasSort("tipo")} className="sortable">
                        Tipo {pessoasSortCol === "tipo" && (pessoasSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handlePessoasSort("razaoSocial")} className="sortable">
                        Razão Social / Nome {pessoasSortCol === "razaoSocial" && (pessoasSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handlePessoasSort("cnpjCpf")} className="sortable">
                        CPF / CNPJ {pessoasSortCol === "cnpjCpf" && (pessoasSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pessoas.map((p, index) => (
                      <tr key={p.id}>
                        <td>{index + 1}</td>
                        <td><strong>{p.id}</strong></td>
                        <td>
                          <span className={`badge ${p.tipo === "FORNECEDOR" ? "badge-danger" : p.tipo === "CLIENTE" ? "badge-success" : "badge-blue"}`}>
                            {p.tipo}
                          </span>
                        </td>
                        <td>{p.razaoSocial}</td>
                        <td>{p.cnpjCpf || "—"}</td>
                        <td>
                          <span className="badge badge-success">ATIVO</span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="btn-small btn-blue" onClick={() => openEditPessoa(p)}>
                              Editar
                            </button>
                            <button className="btn-small btn-danger" onClick={() => deletePessoa(p.id)}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: CLASSIFICAÇÕES ==================== */}
        {activeTab === "classificacoes" && (
          <div className="section-card">
            {/* Search and Toolbar */}
            <div className="toolbar">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Buscar por descrição ou tipo..." 
                  value={classificacoesSearch}
                  onChange={(e) => setClassificacoesSearch(e.target.value)}
                />
                <button className="btn-action btn-blue" onClick={() => fetchClassificacoes(false)}>Buscar</button>
                <button className="btn-action btn-slate" onClick={() => fetchClassificacoes(true)}>TODOS (Ativos)</button>
              </div>
              <button className="btn-action btn-green" onClick={() => { resetClassificacaoForm(); setShowClassificacaoForm(true); }}>
                + Nova Classificação
              </button>
            </div>

            {/* Creation Modal */}
            {showClassificacaoForm && (
              <div className="modal-overlay">
                <div className="modal-container" style={{ maxWidth: "450px" }}>
                  <div className="modal-header">
                    <h2>{isEditingClassificacao ? "Editar Classificação" : "Cadastrar Classificação"}</h2>
                    <button className="close-btn" onClick={() => setShowClassificacaoForm(false)}>✕</button>
                  </div>
                  <form onSubmit={saveClassificacao} className="modal-form">
                    <div className="form-group">
                      <label>Tipo</label>
                      <select 
                        value={classificacaoForm.tipo}
                        onChange={(e) => setClassificacaoForm(prev => ({ ...prev, tipo: e.target.value }))}
                      >
                        <option value="DESPESA">Despesa (DESPESA)</option>
                        <option value="RECEITA">Receita (RECEITA)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Descrição</label>
                      <input 
                        type="text"
                        placeholder="Ex: Combustível, Venda de Mercadoria..."
                        value={classificacaoForm.descricao}
                        onChange={(e) => setClassificacaoForm(prev => ({ ...prev, descricao: e.target.value }))}
                      />
                    </div>

                    {/* STATUS field logically hidden */}

                    <div className="modal-footer">
                      <button type="button" className="btn-action btn-slate" onClick={() => setShowClassificacaoForm(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn-action btn-green">
                        {isEditingClassificacao ? "Salvar Alterações" : "Cadastrar"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* List Table */}
            {classificacoes === null ? (
              <div className="empty-state">
                <p>Nenhum dado carregado. Utilize os botões de Busca ou TODOS para trazer registros.</p>
              </div>
            ) : classificacoes.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma classificação ativa encontrada.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th onClick={() => handleClassSort("id")} className="sortable">
                        ID {classificacoesSortCol === "id" && (classificacoesSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleClassSort("tipo")} className="sortable">
                        Tipo {classificacoesSortCol === "tipo" && (classificacoesSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleClassSort("descricao")} className="sortable">
                        Descrição {classificacoesSortCol === "descricao" && (classificacoesSortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classificacoes.map((c, index) => (
                      <tr key={c.id}>
                        <td>{index + 1}</td>
                        <td><strong>{c.id}</strong></td>
                        <td>
                          <span className={`badge ${c.tipo === "DESPESA" ? "badge-danger" : "badge-success"}`}>
                            {c.tipo}
                          </span>
                        </td>
                        <td>{c.descricao}</td>
                        <td>
                          <span className="badge badge-success">ATIVO</span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="btn-small btn-blue" onClick={() => openEditClassificacao(c)}>
                              Editar
                            </button>
                            <button className="btn-small btn-danger" onClick={() => deleteClassificacao(c.id)}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: EXTRAÇÃO IA (UPLOAD) ==================== */}
        {activeTab === "upload" && (
          <div>
            <div className="section-card">
              <div className="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload do PDF da Nota Fiscal
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
                  {loading ? "Processando IA..." : "EXTRAIR DADOS COM GEMINI"}
                </button>
              </div>
            </div>

            {resultado && (
              <div className="section-card" style={{ marginTop: "24px" }}>
                <div className="tabs">
                  <div 
                    className={`tab ${uploadTab === "visual" ? "active" : "inactive"}`}
                    onClick={() => setUploadTab("visual")}
                  >
                    Visualização Formatada
                  </div>
                  <div 
                    className={`tab ${uploadTab === "json" ? "active" : "inactive"}`}
                    onClick={() => setUploadTab("json")}
                  >
                    JSON Extraído
                  </div>
                  <div 
                    className={`tab ${uploadTab === "analise" ? "active" : "inactive"}`}
                    onClick={analisarNoBanco}
                  >
                    {analisando ? "Verificando DB..." : "Análise de Integração"}
                  </div>
                </div>

                {uploadTab === "visual" && (
                  <div className="format-view">
                    <div className="format-box">
                      <h3>Fornecedor</h3>
                      <div className="format-item">
                        <span className="format-label">Razão Social / Fantasia</span>
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

                    <div className="format-box" style={{ gridColumn: "span 2" }}>
                      <h3>Dados do Documento e Classificação</h3>
                      <div className="format-item" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div>
                          <span className="format-label">Número Nota</span>
                          <span className="format-value">{resultado.numeroNotaFiscal}</span>
                        </div>
                        <div>
                          <span className="format-label">Data Emissão</span>
                          <span className="format-value">{resultado.dataEmissao}</span>
                        </div>
                        <div>
                          <span className="format-label">Valor Total</span>
                          <span className="format-value" style={{ fontSize: "16px", color: "var(--success-color)", fontWeight: "bold" }}>
                            R$ {resultado.valorTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="format-item">
                        <span className="format-label">Classificação Sugerida</span>
                        <div className="categories-list">
                          {resultado.classificacoesDespesa.map((cat, i) => (
                            <span key={i} className="badge badge-danger">
                              {cat.descricao} (R$ {cat.valor})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
                      <button className="btn-action btn-blue" onClick={analisarNoBanco} style={{ padding: "12px 24px" }}>
                        Avançar para Integração
                      </button>
                    </div>
                  </div>
                )}

                {uploadTab === "json" && (
                  <div>
                    <div className="json-view-header">
                      <div className="json-title">JSON Retornado pelo Gemini</div>
                      <button className="btn-copy" onClick={copyJSON}>
                        {copied ? "Copiado!" : "Copiar JSON"}
                      </button>
                    </div>
                    <div className="json-container">
                      <pre>{JSON.stringify(resultado, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {uploadTab === "analise" && analise && (
                  <div className="analise-view">
                    <h2>Análise de Correspondência no SQLite</h2>
                    
                    <div className="analise-card">
                      <strong>Fornecedor Cadastrado?</strong><br/>
                      Nome: {analise.fornecedor.nome}<br/>
                      CNPJ: {analise.fornecedor.documento}<br/>
                      <span className={analise.fornecedor.existe ? "status-existe" : "status-nao-existe"}>
                        {analise.fornecedor.existe ? `Sim (ID: ${analise.fornecedor.id})` : "Não (Será cadastrado)"}
                      </span>
                    </div>

                    <div className="analise-card">
                      <strong>Faturado Cadastrado?</strong><br/>
                      Nome: {analise.faturado.nome}<br/>
                      CPF: {analise.faturado.documento}<br/>
                      <span className={analise.faturado.existe ? "status-existe" : "status-nao-existe"}>
                        {analise.faturado.existe ? `Sim (ID: ${analise.faturado.id})` : "Não (Será cadastrado)"}
                      </span>
                    </div>

                    {analise.despesas.map((desp: any, idx: number) => (
                      <div className="analise-card" key={idx}>
                        <strong>Classificação: {desp.descricao}</strong><br/>
                        <span className={desp.existe ? "status-existe" : "status-nao-existe"}>
                          {desp.existe ? `Categoria Existente (ID: ${desp.id})` : "Categoria Nova (Será cadastrada)"}
                        </span>
                      </div>
                    ))}

                    <div style={{ marginTop: "20px" }}>
                      {sucesso ? (
                        <div style={{ padding: "16px", backgroundColor: "#D1FAE5", color: "#065F46", borderRadius: "8px", textAlign: "center", fontWeight: "bold" }}>
                          ✓ Registro integrado com sucesso! Contas e parcelas foram salvas.
                        </div>
                      ) : (
                        <button className="btn-primary" onClick={salvarNoBanco} disabled={salvando} style={{ backgroundColor: "#10B981" }}>
                          {salvando ? "Salvando..." : "Confirmar Integração no Banco de Dados"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: RAG CHAT ==================== */}
        {activeTab === "rag" && (
          <div className="section-card">
            <div className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Consulte seu Financeiro com IA (RAG)
            </div>
            
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px", lineHeight: "1.6" }}>
              Pergunte sobre faturamento, despesas de um fornecedor, parcelas a vencer, resumos anuais ou maiores credores. O agente recupera o contexto atual do SQLite e formula a resposta.
            </p>

            <div className="rag-selectors" style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--primary-color)", display: "block", marginBottom: "8px" }}>
                Modelo de RAG
              </span>
              <div style={{ display: "flex", gap: "12px" }}>
                <label className={`rag-tab ${ragTipo === "simples" ? "active" : "inactive"}`} 
                       onClick={() => setRagTipo("simples")}
                       style={{ flex: 1, padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", backgroundColor: ragTipo === "simples" ? "#F1F5F9" : "white" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>RAG Simples</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Busca por termos de palavras-chave</span>
                </label>

                <label className={`rag-tab ${ragTipo === "embeddings" ? "active" : "inactive"}`}
                       onClick={() => setRagTipo("embeddings")}
                       style={{ flex: 1, padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", backgroundColor: ragTipo === "embeddings" ? "#F1F5F9" : "white" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>RAG Embeddings Vetorial</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Busca semântica avançada com Gemini Embeddings</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <textarea
                className="rag-textarea"
                placeholder="Ex: Qual o valor total que gastei com Beltrano Insumos? ou Quais parcelas vencem em maio de 2025?"
                value={ragPergunta}
                onChange={(e) => setRagPergunta(e.target.value)}
                disabled={ragLoading}
                rows={3}
                style={{ width: "100%", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }}
              />
              
              <button
                className="btn-primary"
                onClick={enviarConsultaRAG}
                disabled={ragLoading || !ragPergunta.trim()}
              >
                {ragLoading ? "Consultando Agente Inteligente..." : "Consultar Banco de Dados"}
              </button>
            </div>

            {ragResposta && (
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--success-color)", backgroundColor: "#E6F4EA", padding: "4px 8px", borderRadius: "4px" }}>
                    Resposta da IA
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Modo: {ragTipo === "embeddings" ? "Embeddings Vetoriais" : "Palavras-Chave"}
                  </span>
                </div>

                <div className="rag-answer" style={{ backgroundColor: "#F8FAFC", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "16px", fontSize: "14.5px", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {formatLLMResponse(ragResposta)}
                </div>

                {ragFontes.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <button
                      onClick={() => setShowFontes(!showFontes)}
                      style={{ background: "transparent", border: "none", color: "#2563EB", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      {showFontes ? "▼ Ocultar fontes de dados recuperadas" : "▶ Mostrar fontes de dados recuperadas"} ({ragFontes.length})
                    </button>

                    {showFontes && (
                      <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {ragFontes.map((fonte, idx) => (
                          <div key={idx} style={{ backgroundColor: "#F1F5F9", borderLeft: "4px solid #64748B", padding: "10px 14px", borderRadius: "0 6px 6px 0", fontSize: "12.5px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                            <strong>[Fonte #{idx + 1}]</strong> {fonte}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
