import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const modelsToTest = ["gemini-2.5-flash", "gemini-2.0-flash-lite-001", "gemini-flash-latest", "gemini-2.0-flash"];
        for (const model of modelsToTest) {
            console.log("Testing:", model);
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: "Say hi"
                });
                console.log("SUCCESS on", model);
                break;
            } catch (e: any) {
                console.log("FAILED on", model, e.message);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
run();
