import { Router } from "express";
import multer from "multer";
import path from "path";
import { processarNota } from "../controllers/notasController";
import { analisarDados, salvarDados } from "../controllers/analiseController";
import { consultarRAG } from "../controllers/ragController";

const router = Router();

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname);
        const nomeArquivo = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`;
        cb(null, nomeArquivo);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Apenas arquivos PDF são permitidos"));
        }

        cb(null, true);
    },
});

router.post("/upload", upload.single("file"), processarNota);
router.post("/analisar", analisarDados);
router.post("/salvar", salvarDados);
router.post("/rag", consultarRAG);

export default router;