# Guia de Publicação no Docker Hub

Este arquivo contém os comandos necessários para compilar e publicar as imagens do seu projeto no Docker Hub usando o seu usuário oficial.

## 1. Autenticação
Antes de começar, certifique-se de estar logado no Docker pelo terminal:
```bash
docker login
```
*(Se necessário, insira seu usuário `joaovitormedeiros` e sua senha).*

## 2. Compilação e Publicação do Backend (API)
Abra o terminal na **raiz do projeto** e execute:

```bash
# Constrói a imagem do backend
docker build -t joaovitormedeiros/admin-financeiro-backend:latest .

# Envia a imagem para o Docker Hub
docker push joaovitormedeiros/admin-financeiro-backend:latest
```

## 3. Compilação e Publicação do Frontend (Web)
Ainda com o terminal na **raiz do projeto**, execute:

```bash
# Constrói a imagem do frontend (apontando para a pasta ./frontend)
docker build -t joaovitormedeiros/admin-financeiro-frontend:latest ./frontend

# Envia a imagem para o Docker Hub
docker push joaovitormedeiros/admin-financeiro-frontend:latest
```

## Pronto!
Suas imagens agora estão públicas no Docker Hub e prontas para serem utilizadas em qualquer servidor ou computador sem a necessidade do código fonte.
