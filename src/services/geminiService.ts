import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../lib/systemPrompt";

export interface AuditFile {
  data: string; // base64
  mimeType: string;
  name: string;
}

export async function auditContent(content: string, files: AuditFile[], apiKey: string): Promise<string> {
  const token = apiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!token) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  const ai = new GoogleGenAI({ apiKey: token });

  const parts: any[] = [];
  if (content.trim()) {
    parts.push(content);
  }
  
  for (const file of files) {
    parts.push({
      inlineData: {
        data: file.data,
        mimeType: file.mimeType
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: parts,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Error auditing content:", error);
    throw error;
  }
}
