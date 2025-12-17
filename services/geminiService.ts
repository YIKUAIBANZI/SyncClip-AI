
import { GoogleGenAI, Type } from "@google/genai";
import { AiAnalysisResult, ClipType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeClipboardContent = async (content: string, inputType: ClipType = ClipType.TEXT): Promise<AiAnalysisResult> => {
  try {
    let parts: any[] = [];

    if (inputType === ClipType.IMAGE) {
        // Expect content to be a Data URL: data:image/png;base64,....
        const matches = content.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            const mimeType = matches[1];
            const data = matches[2];
            parts = [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: data
                    }
                },
                {
                    text: "Analyze this image. Provide a very short summary (max 10 words) of what is visible. Suggest 1-3 tags."
                }
            ];
        } else {
            // Invalid image data
            return {
                type: ClipType.IMAGE,
                summary: "Image upload",
                tags: ["image"],
            };
        }
    } else {
        // Text analysis
        parts = [{
            text: `Analyze the following clipboard text and categorize it. 
            Provide a very short summary (max 10 words).
            Determine if it is a URL, Source Code, Email Address, or General Text.
            Suggest 1-3 short tags.
            
            Text to analyze:
            ${content.substring(0, 5000)}`
        }];
    }

    // Using gemini-3-flash-preview for analysis and categorization
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts }, 
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: [ClipType.TEXT, ClipType.URL, ClipType.CODE, ClipType.EMAIL, ClipType.IMAGE],
              description: "The category of the content. If input was image, must be IMAGE.",
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
      const result = JSON.parse(response.text) as AiAnalysisResult;
      // Force type to IMAGE if input was image, ensuring consistency
      if (inputType === ClipType.IMAGE) {
          result.type = ClipType.IMAGE;
      }
      return result;
    }
    
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Fallback if AI fails
    return {
      type: inputType,
      summary: inputType === ClipType.IMAGE ? "Image" : (content.substring(0, 30) + "..."),
      tags: ["Unprocessed"],
    };
  }
};
