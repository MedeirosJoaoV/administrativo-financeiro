# Administrativo Financeiro - Extração de Notas Fiscais com IA

Este projeto é um sistema web para **Extração e Análise de Notas Fiscais em PDF** utilizando Inteligência Artificial (Google Gemini). O sistema processa o PDF da nota, extrai os dados estruturados (Fornecedor, Cliente, Produtos, Parcelas), classifica a categoria da despesa, e em seguida cruza os dados com um Banco de Dados SQLite local para verificar a existência dos registros e efetivar a persistência.

## 🚀 Tecnologias Utilizadas

- **Backend**: Node.js, Express, TypeScript, SQLite
- **Inteligência Artificial**: Google Gen AI SDK (`@google/genai` com o modelo `gemini-2.5-flash`)
- **Frontend**: React, Vite, TypeScript, Axios, Vanilla CSS
- **Infraestrutura**: Docker e Docker Compose

---

## 📋 Pré-requisitos

Para rodar o projeto, você precisará ter instalado na sua máquina:
- [Git](https://git-scm.com/)
- [Docker e Docker Compose](https://www.docker.com/products/docker-desktop) (Recomendado)
- **OU** [Node.js](https://nodejs.org/en/) (Versão 18 ou superior) caso queira rodar localmente sem Docker.

Você também precisará de uma **Chave de API do Google Gemini**. Você pode gerar uma gratuitamente no [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## ⚙️ Configuração Inicial (Importante!)

Antes de iniciar a aplicação, você precisa configurar a sua chave de API.

1. Na pasta raiz do projeto, existe um arquivo chamado `.env` (se não existir, crie um arquivo com esse exato nome).
2. O conteúdo do arquivo `.env` deve ser o seguinte:

```env
MODO_MOCK=false
GEMINI_API_KEY=coloque_sua_chave_do_gemini_aqui
```
*Aviso: Substitua `coloque_sua_chave_do_gemini_aqui` pela sua chave real gerada no Google AI Studio. Se você deixar `MODO_MOCK=true`, a IA não será acionada e o sistema retornará dados fictícios para testes.*

---

## 🐳 Como rodar usando Docker (Recomendado)

A forma mais fácil de rodar o projeto é utilizando o Docker Compose, pois ele já configura e levanta o backend, o frontend e o banco de dados automaticamente.

1. Abra o terminal na pasta raiz do projeto.
2. Execute o comando:
   ```bash
   docker-compose up --build
   ```
3. Aguarde a finalização da compilação das imagens.
4. Acesse o sistema pelo navegador:
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)

---

## 💻 Como rodar localmente (Sem Docker)

Se preferir rodar manualmente com o Node.js:

### 1. Iniciando o Backend
Abra um terminal na pasta raiz do projeto e execute:
```bash
npm install
npm run dev
```
O servidor do backend iniciará na porta `3000` e o arquivo do banco de dados (`database.sqlite`) será criado automaticamente.

### 2. Iniciando o Frontend
Mantenha o terminal do backend aberto, abra **um novo terminal**, entre na pasta `frontend` e execute:
```bash
cd frontend
npm install
npm run dev
```
Acesse `http://localhost:5173` no seu navegador para utilizar o sistema.

---

## 📝 Como testar e usar o sistema

1. **Upload do PDF**: Na tela inicial, clique para selecionar um arquivo PDF de uma Nota Fiscal válida.
2. **Extrair Dados**: Clique no botão para acionar o Google Gemini. O sistema pode levar alguns segundos processando o documento.
3. **Visualização**: Os dados extraídos aparecerão divididos em Cards (Fornecedor, Faturado, Valores, Parcelas e Categoria classificada pela IA). Na aba lateral, é possível visualizar o JSON bruto.
4. **Análise de Banco**: Clique na aba "Análise do Banco" ou no botão "Avançar para Integração". O sistema vai checar no banco de dados SQLite quais dados já existem.
5. **Integração**: Clique no botão "Criar Registros no Sistema" para salvar as novas entidades e lançar as Movimentações e Parcelas. Se você testar novamente com o mesmo PDF, o sistema mostrará que os registros já **Existem** e mostrará o ID deles.

---

## 🛠️ Estrutura do Projeto

- `/src/database/db.ts`: Configuração e criação dinâmica das tabelas do SQLite.
- `/src/services/geminiService.ts`: Serviço que faz a comunicação e upload de arquivos para a API do Google Gemini.
- `/src/controllers/analiseController.ts`: Controla a lógica de consulta (SELECT) e gravação (INSERT) na base de dados.
- `/frontend/src/App.tsx`: Toda a lógica e fluxo visual da aplicação em React.
- `/frontend/src/index.css`: Arquivo de estilização construído com CSS puro focado em um design visual limpo e moderno.
