
import { GoogleGenAI, Type } from "@google/genai";
import { UserData, Activity, CourseModule, Lesson } from "../types";

let currentUserData: UserData | null = null;

// Declare global for AI Studio environment
declare global {
  // Fix: Explicitly define AIStudio interface to match environmental expectations
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fix: Match the expected 'AIStudio' type and use identical modifiers (readonly)
    readonly aistudio: AIStudio;
  }
}

const getSystemPrompt = () => {
  const basePrompt = "You are a world-class, empathetic AI relationship coach from 'Bonds Connect'. You use evidence-based frameworks like the Gottman Method and EFT. Your goal is to provide supportive, insightful, and practical advice. Keep responses concise, encouraging, and actionable. Use markdown.";
  
  if (currentUserData) {
    const focusString = currentUserData.focusAreas.join(', ');
    return `${basePrompt} You are coaching ${currentUserData.userName} and ${currentUserData.partnerName} (${currentUserData.yearsTogether} together). Focus areas: ${focusString}.`;
  }
  
  return basePrompt;
};

export const initializeGeminiContext = (userData: UserData) => {
  currentUserData = userData;
};

/**
 * Handles API errors, specifically looking for key selection issues
 */
const handleApiError = async (error: any) => {
  console.error("Gemini API Error:", error);
  const errorMessage = error?.message || "";
  
  if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("API key")) {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      console.warn("API Key issue detected. Opening selection dialog.");
      await window.aistudio.openSelectKey();
    }
  }
  return "I'm having a slight connection issue. Please make sure your API key is active and try again.";
};

/**
 * Creates a fresh AI instance for every call to ensure the latest API key is used
 */
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getCoachingResponse = async (message: string): Promise<string> => {
    if (!process.env.API_KEY) {
        return "Please configure your API key to talk to the coach.";
    }

    try {
        const ai = getAiClient();
        // Relationship coaching is a complex task, using Pro model
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: message,
            config: {
                systemInstruction: getSystemPrompt(),
                temperature: 0.7,
            }
        });
        return response.text || "";
    } catch (error) {
        return await handleApiError(error);
    }
};

export const getDailyPrompt = async (): Promise<string> => {
    if (!process.env.API_KEY) {
        return "What's one thing you appreciate about your partner today?";
    }

    try {
        const ai = getAiClient();
        let promptRequest = "Generate one deep daily connection prompt for a couple.";
        if (currentUserData) {
            promptRequest += ` Focus on: ${currentUserData.focusAreas.join(', ')}.`;
        }
        promptRequest += " No preamble, just the prompt.";

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: promptRequest,
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Error getting daily prompt:", error);
        return "What's a dream you haven't shared with me yet?";
    }
}

export const generateActivities = async (vibe: string): Promise<Activity[]> => {
    if (!process.env.API_KEY) return [];

    try {
        const ai = getAiClient();
        let prompt = `Generate 4 unique relationship activities. Vibe: ${vibe}.`;
        if (currentUserData) {
            prompt += ` Context: ${currentUserData.yearsTogether} together, focusing on ${currentUserData.focusAreas.join(', ')}.`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            category: { type: Type.STRING },
                            description: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            difficulty: { type: Type.STRING },
                        },
                        required: ["title", "category", "description", "duration", "difficulty"]
                    }
                }
            }
        });
        
        if (response.text) {
             const data = JSON.parse(response.text);
             return data.map((item: any) => ({ ...item, isGenerated: true }));
        }
        return [];
    } catch (error) {
        await handleApiError(error);
        return [];
    }
};

export const generateLearningPath = async (): Promise<CourseModule[]> => {
    if (!process.env.API_KEY) return [];

    try {
        const ai = getAiClient();
        const prompt = `Create a 4-module relationship growth course for a couple focused on ${currentUserData?.focusAreas.join(', ') || 'growth'}. 
        First module status: "active", others "locked".`;

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ["active", "locked", "completed"] },
                        },
                        required: ["title", "description", "duration", "status"]
                    }
                }
            }
        });

        return response.text ? JSON.parse(response.text) : [];
    } catch (error) {
        await handleApiError(error);
        return [];
    }
};

export const generateModuleContent = async (moduleTitle: string): Promise<Lesson[]> => {
    if (!process.env.API_KEY) return [];

    try {
        const ai = getAiClient();
        const prompt = `Create a 3-lesson curriculum for the module: "${moduleTitle}". Focus: ${currentUserData?.focusAreas.join(', ')}. 
        Include detailed Markdown 'longContent' for each lesson (Reading, Exercise, or Prompt).`;

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["Reading", "Exercise", "Prompt"] },
                            description: { type: Type.STRING },
                            longContent: { type: Type.STRING },
                        },
                        required: ["title", "type", "description", "longContent"]
                    }
                }
            }
        });

        return response.text ? JSON.parse(response.text) : [];
    } catch (error) {
        await handleApiError(error);
        return [];
    }
}