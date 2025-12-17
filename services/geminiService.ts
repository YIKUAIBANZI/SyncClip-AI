import { GoogleGenAI, Type } from "@google/genai";
import { AiAnalysisResult, ClipType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeClipboardContent = async (text: string): Promise<AiAnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following clipboard text and categorize it. 
      Provide a very short summary (max 10 words).
      Determine if it is a URL, Source Code, Email Address, or General Text.
      Suggest 1-3 short tags.
      
      Text to analyze:
      ${text.substring(0, 5000)}`, // Limit input length for safety
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: [ClipType.TEXT, ClipType.URL, ClipType.CODE, ClipType.EMAIL],
              description: "The category of the content",
            },
            summary: {
              type: Type.STRING,
              description: "A very brief summary of the content (max 10 words)",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "1-3 keywords describing the content",
            },
          },
          required: ["type", "summary", "tags"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AiAnalysisResult;
    }
    
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Fallback if AI fails
    return {
      type: ClipType.TEXT,
      summary: text.substring(0, 30) + "...",
      tags: ["Unprocessed"],
    };
  }
};