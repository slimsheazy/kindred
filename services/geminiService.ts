
import { GoogleGenAI, Type } from "@google/genai";
import { UserData, Activity, CourseModule, Lesson, QuizQuestion, MicroStep, JournalEntry, ChatMessage } from "../types";

let currentUserData: UserData | null = null;

const getSystemPrompt = () => {
  const basePrompt = "You are a world-class, empathetic AI relationship coach from 'Kindred'. You use evidence-based frameworks like the Gottman Method and EFT. Your goal is to provide supportive, insightful, and practical advice. You have access to the couple's conversation history; use it to recall past advice, themes, or progress. Keep responses concise, encouraging, and actionable. Use markdown.";
  
  if (currentUserData) {
    const focusString = (currentUserData.focusAreas || []).join(', ');
    return `${basePrompt} You are coaching ${currentUserData.userName} and ${userDataPartnerName(currentUserData)}. Focus areas: ${focusString}.`;
  }
  
  return basePrompt;
};

const userDataPartnerName = (u: UserData) => u?.partnerName || 'Partner';

export const initializeGeminiContext = (userData: UserData) => {
  currentUserData = userData;
};

const extractJson = (text: string): string => {
  try {
    const jsonBlockMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[0].trim();
    }
    return text.trim();
  } catch (e) {
    console.error("JSON extraction failed", e);
    return "[]";
  }
};

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export const getCoachingResponse = async (message: string, history: ChatMessage[] = []): Promise<string> => {
    try {
        const ai = getAiClient();
        
        // Convert local history format to Gemini parts
        const contents = history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

        // Append the current message
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: contents as any,
            config: { systemInstruction: getSystemPrompt(), temperature: 0.7 }
        });
        return response.text || "Kindred is observing silently. Please continue.";
    } catch (error) {
        console.error("Coaching error", error);
        return "Connection interrupted. Please verify your environment variables.";
    }
};

export const generateJournalEchoes = async (entries: JournalEntry[]): Promise<{ synthesis: string, themes: string[] }> => {
    try {
        const ai = getAiClient();
        const historyText = entries.map(e => `[${e.date} by ${e.author}]: ${e.text}`).join('\n---\n');
        const prompt = `You are Kindred, looking at a shared history of journal entries for ${currentUserData?.userName} and ${userDataPartnerName(currentUserData!)}. 
        Entries:
        ${historyText}

        1. Synthesize these memories into a single, poetic paragraph (the "Echo") that identifies a core emotional thread or growth point currently active in their relationship.
        2. Identify 3-4 recurring themes (one or two words each).
        
        Return ONLY a JSON object: {"synthesis": "...", "themes": ["...", "..."]}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        synthesis: { type: Type.STRING },
                        themes: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["synthesis", "themes"]
                }
            }
        });
        return JSON.parse(extractJson(response.text || '{}'));
    } catch (error) {
        console.error("Echo synthesis error:", error);
        return { synthesis: "The threads of your story are still weaving. Add more memories to hear the echo.", themes: [] };
    }
};

export const tagJournalEntry = async (text: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Analyze this relationship memory: "${text}". Provide 3 short thematic tags (one word each) that describe its energy. Return ONLY a JSON array of strings.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(extractJson(response.text || '[]'));
    } catch (error) {
        return ["Memory"];
    }
};

export const analyzeInteractionForScores = async (context: string): Promise<{ category: string, delta: number }[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Analyze this relationship interaction context: "${context}". 
        Evaluate its impact on the following categories: [Communication, Intimacy, Trust, Conflict, Shared Vision]. 
        Return a JSON array of objects, each with "category" and "delta" (a number between -1 and 1). 
        Only include categories that were significantly impacted. 
        Return ONLY a JSON array: [{"category": "...", "delta": 0.5}, ...]`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                // Fix: Updated schema to expect an ARRAY of objects to match the prompt and return expectations
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING },
                            delta: { type: Type.NUMBER }
                        },
                        required: ["category", "delta"]
                    }
                }
            }
        });
        return JSON.parse(extractJson(response.text || '[]'));
    } catch (e) {
        console.error("Score analysis failed", e);
        return [];
    }
}

export const generateGoalMicroSteps = async (goalTitle: string): Promise<MicroStep[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Break down this relationship goal into 4 small, actionable "micro-steps" for Kindred. 
        Goal: "${goalTitle}". 
        Context: ${currentUserData?.userName} and ${userDataPartnerName(currentUserData!)}.
        Return ONLY a JSON array of strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const steps: string[] = JSON.parse(extractJson(response.text || '[]'));
        return steps.map((text, i) => ({ id: `step-${Date.now()}-${i}`, text, completed: false }));
    } catch (error) {
        console.error("Micro-step gen error:", error);
        return [];
    }
};

export const getGoalEncouragement = async (goalTitle: string, progress: number): Promise<string> => {
    try {
        const ai = getAiClient();
        const prompt = `Provide a poetic and brief encouraging insight for ${currentUserData?.userName} and ${userDataPartnerName(currentUserData!)} regarding their goal "${goalTitle}" which is currently at ${progress}% progress. 
        Keep it to one or two sentences. No preamble.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { temperature: 0.9 }
        });
        return response.text?.trim() || "The path forward is illuminated by your shared intention.";
    } catch (error) {
        return "Your dedication to this goal strengthens the bond you share.";
    }
};

export const interpretSynchronicity = async (base64Image: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
            },
        };
        const textPart = {
            text: `You are the Kindred Oracle. Look at this image captured by ${currentUserData?.userName || 'a seeker'}. 
            Find a poetic synchronicity, a hidden metaphor, or a spiritual omen within it that relates to the shared journey of two souls (the user and their partner ${userDataPartnerName(currentUserData!)}). 
            Interpret its textures, patterns, or colors as a mirror of their current connection. 
            Keep it brief, mystical, beautiful, and deeply insightful. Use Markdown.`
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [imagePart, textPart] },
            config: { temperature: 0.9 }
        });
        return response.text || "The Oracle sees only silence in this light. Try again.";
    } catch (error) {
        console.error("Vision error", error);
        return "The lens is blurred by the mundane. Seek clarity and try again.";
    }
};

export const generateQuizQuestions = async (topic: string): Promise<QuizQuestion[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Generate 5 fun and meaningful questions for a couples quiz about the topic: "${topic}". 
        Context: ${currentUserData?.userName} and ${userDataPartnerName(currentUserData!)}.
        Return ONLY a JSON array of objects with id, question, type (open or multiple_choice), and options (if multiple_choice).`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            question: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["open", "multiple_choice"] },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["id", "question", "type"]
                    }
                }
            }
        });
        const text = response.text || "[]";
        const cleaned = extractJson(text);
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("Quiz gen error:", error);
        return [];
    }
};

export const interpretQuizResults = async (quizTitle: string, userAnswers: any[], partnerAnswers: any[]): Promise<string> => {
    try {
        const ai = getAiClient();
        const combined = JSON.stringify({ userAnswers, partnerAnswers });
        const prompt = `Interpret these combined results from the couples quiz "${quizTitle}" for Kindred.
        Results: ${combined}.
        Provide a "Kindred Synthesis" and an "Insight". Use Markdown for elegant formatting.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { systemInstruction: getSystemPrompt(), temperature: 0.8 }
        });
        return response.text || "";
    } catch (error) {
        return "Your connection has its own unique, beautiful rhythm. Keep exploring each other.";
    }
};

export const generateLearningPath = async (): Promise<CourseModule[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Generate a learning path for a relationship app named Kindred. 
        User: ${currentUserData?.userName}, Partner: ${userDataPartnerName(currentUserData!)}, Focus Areas: ${(currentUserData?.focusAreas || []).join(', ')}.
        Create 3 sequential modules with lessons.
        Return ONLY a JSON array of CourseModule objects.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ["active", "locked", "completed"] },
                            content: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        title: { type: Type.STRING },
                                        type: { type: Type.STRING, enum: ["Reading", "Exercise", "Prompt"] },
                                        description: { type: Type.STRING },
                                        longContent: { type: Type.STRING }
                                    },
                                    required: ["id", "title", "type", "description", "longContent"]
                                }
                            }
                        },
                        required: ["id", "title", "description", "duration", "status"]
                    }
                }
            }
        });
        const text = response.text || "[]";
        return JSON.parse(extractJson(text));
    } catch (error) {
        console.error("Learning path gen error:", error);
        return [];
    }
};

export const generateActivities = async (vibe: string): Promise<Activity[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Generate 4 relationship activities for the app Kindred with a "${vibe}" vibe. 
        Context: ${currentUserData?.userName} and ${userDataPartnerName(currentUserData!)}.
        Return ONLY a JSON array of Activity objects.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            category: { type: Type.STRING },
                            description: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            difficulty: { type: Type.STRING },
                            isGenerated: { type: Type.BOOLEAN }
                        },
                        required: ["id", "title", "category", "description", "duration", "difficulty"]
                    }
                }
            }
        });
        const text = response.text || "[]";
        return JSON.parse(extractJson(text));
    } catch (error) {
        console.error("Activity gen error:", error);
        return [];
    }
};

export const getDailyPrompt = async (): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate one deep daily connection prompt for a couple for the app Kindred. Focus: ${(currentUserData?.focusAreas || []).join(', ') || 'general bond'}. No preamble.`,
        });
        return response.text?.trim() || "What is one thing that made you smile about us today?";
    } catch (error) {
        return "What is one thing that made you feel truly seen by your partner recently?";
    }
};
