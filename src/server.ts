import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import notasRoutes from "./routes/notasRoutes.ts";

import path from "path";

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/notas", notasRoutes);

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});