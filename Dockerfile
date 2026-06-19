FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Popula o banco de dados SQLite com os 200 registros na etapa de build
RUN npx ts-node src/database/seed.ts

EXPOSE 3000

CMD ["npm", "run", "dev"]
