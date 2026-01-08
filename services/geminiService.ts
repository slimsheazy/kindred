import { GoogleGenAI, Chat, Type } from "@google/genai";
import { UserData, Activity, CourseModule, Lesson } from "../types";

let chat: Chat | null = null;
let currentUserData: UserData | null = null;

const getSystemPrompt = () => {
  const basePrompt = "You are a warm, empathetic AI relationship coach from the 'Bonds Connect' app. Your goal is to provide supportive, insightful, and practical advice based on relationship science principles like the Gottman Method and Emotionally Focused Therapy. Avoid clinical diagnoses. Keep responses concise, encouraging, and actionable. Use markdown for formatting when appropriate.";
  
  if (currentUserData) {
    const focusString = currentUserData.focusAreas.join(', ');
    return `${basePrompt} You are specifically coaching ${currentUserData.userName} and their partner ${currentUserData.partnerName}. They have been together for ${currentUserData.yearsTogether}. Their primary relationship focus areas are: "${focusString}". Tailor your advice to support these specific goals.`;
  }
  
  return basePrompt;
};

export const initializeGeminiContext = (userData: UserData) => {
  currentUserData = userData;
  chat = null; // Reset chat to apply new prompt
};

const getChat = () => {
    if (!chat) {
        if (!process.env.API_KEY) {
            console.warn("API_KEY environment variable not set. Using mock responses.");
            return null;
        }
        // Always initialize the client using the named apiKey parameter
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: getSystemPrompt(),
            },
        });
    }
    return chat;
}

export const getCoachingResponse = async (message: string): Promise<string> => {
    const chatSession = getChat();
    if (!chatSession) {
        return new Promise(resolve => setTimeout(() => resolve("This is a mock response because the API key is not set. To get a real response, please configure your API key."), 1000));
    }

    try {
        // chat.sendMessage accepts a message parameter and returns a response containing the generated text
        const response = await chatSession.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error getting coaching response:", error);
        return "I'm sorry, I'm having a little trouble right now. Please try again in a moment.";
    }
};

export const getDailyPrompt = async (): Promise<string> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY environment variable not set. Using mock prompt.");
        return "What's a small gesture from your partner that recently made you feel loved?";
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let promptRequest = "Generate one, and only one, deep and thoughtful daily connection prompt for a couple to answer.";
        if (currentUserData) {
            promptRequest += ` The couple is focused on "${currentUserData.focusAreas.join(', ')}".`;
        }
        promptRequest += " The prompt should encourage vulnerability and sharing. Do not add any preamble or extra text, just the prompt itself.";

        // Use generateContent for a direct text response using the recommended flash model
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: promptRequest,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error getting daily prompt:", error);
        return "What's a dream you haven't shared with me yet?";
    }
}

export const generateActivities = async (vibe: string): Promise<Activity[]> => {
    if (!process.env.API_KEY) {
        return [
            { title: "Mock Activity 1", category: vibe, description: "Description here.", duration: "30 mins", difficulty: "Easy", isGenerated: true },
            { title: "Mock Activity 2", category: vibe, description: "Description here.", duration: "1 hour", difficulty: "Medium", isGenerated: true }
        ];
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let prompt = `Generate 4 unique, engaging relationship activities or date ideas for a couple. 
    The requested vibe is: ${vibe}.`;
    
    if (currentUserData) {
        prompt += ` The couple has been together for ${currentUserData.yearsTogether} and wants to focus on ${currentUserData.focusAreas.join(', ')}.`;
    }

    prompt += ` Return valid JSON.`;

    try {
        // Request structured JSON output using responseSchema and gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
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
                        }
                    }
                }
            }
        });
        
        // Extracting generated text directly from the text property
        if (response.text) {
             const data = JSON.parse(response.text);
             return data.map((item: any) => ({ ...item, isGenerated: true }));
        }
        return [];
    } catch (error) {
        console.error("Error generating activities:", error);
        return [];
    }
};

export const generateLearningPath = async (): Promise<CourseModule[]> => {
    if (!process.env.API_KEY) {
        return [
            { title: "Foundation of Connection", description: "Revisiting the core reasons you fell in love.", duration: "Week 1", status: "active" },
            { title: "Communication Styles", description: "Identifying how you both express needs.", duration: "Week 2", status: "locked" },
            { title: "Shared Vision", description: "Aligning your future goals.", duration: "Week 3", status: "locked" },
        ];
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let prompt = `Create a 4-module relationship growth course (learning path) for a couple. 
    They have been together for ${currentUserData?.yearsTogether || 'some time'}.
    Their specific focus areas are: ${currentUserData?.focusAreas.join(', ') || 'general growth'}.
    
    Each module should have a title, a short description, and a duration (e.g., "Week 1").
    The first module should be "active", others "locked".
    `;

    try {
        // Generating learning path modules in JSON format
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
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
                        }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return [];
    } catch (error) {
        console.error("Error generating learning path:", error);
        return [];
    }
};

export const generateModuleContent = async (moduleTitle: string): Promise<Lesson[]> => {
    if (!process.env.API_KEY) {
        return [
             { 
                 title: "Understanding Your Emotional Blueprint", 
                 type: "Reading", 
                 description: "A deep dive into how your past shapes your present connection.",
                 longContent: "## The Architecture of Love\n\nYour 'Emotional Blueprint' is the set of assumptions and expectations you bring into your relationship, often formed in childhood. \n\n### Why it Matters\nWhen we understand our own blueprint, we stop reacting blindly to triggers. For example, if you grew up in a home where conflict was dangerous, you might shut down during arguments. Your partner might interpret this as indifference, when it's actually self-protection.\n\n### Reflection\nThink about the last time you felt truly understood. What did your partner do? That is a clue to your blueprint." 
             },
             { 
                 title: "The 'Daily Temperature Reading' Exercise", 
                 type: "Exercise", 
                 description: "A practical 5-step method to clear the air and reconnect daily.",
                 longContent: "## Daily Temperature Reading\n\nSet aside 15 minutes today to try this structural conversation. Take turns for each step.\n\n1. **Appreciations**: Share 3 specific things you appreciated about your partner today.\n2. **New Information**: Update each other on logistics, news, or mood.\n3. **Puzzles**: Ask about something you don't understand (e.g., 'I wasn't sure what you meant when...'). Avoid accusations.\n4. **Complaints with Requests**: 'I feel X when Y happens. In the future, could you Z?'\n5. **Wishes, Hopes, Dreams**: Share one thing you are looking forward to." 
             },
             {
                 title: "Navigating Conflict Styles",
                 type: "Prompt",
                 description: "Discussing how you fight and how you heal.",
                 longContent: "## Discussion: Conflict Styles\n\nWe all fight differently. Some of us are 'pursuers' who want to solve it *now*, and some are 'withdrawers' who need space to process.\n\n**Ask each other:**\n1. In our last argument, did you feel the urge to push closer or pull away?\n2. What is one thing I can say when we are arguing that helps you feel safe?\n3. How did your parents handle conflict, and how is our way similar or different?"
             }
        ];
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let prompt = `Create a detailed, fully fleshed-out curriculum for the relationship course module "${moduleTitle}".
    The couple focuses on: ${currentUserData?.focusAreas.join(', ')}.
    
    Generate 3 specific lessons.
    For each lesson, provide:
    1. Title
    2. Type ('Reading', 'Exercise', or 'Prompt')
    3. Description (a short 1-sentence summary)
    4. LongContent (THE MOST IMPORTANT PART):
       - If 'Reading': Write a thoughtful, 150-200 word mini-article on the topic. Use Markdown headers.
       - If 'Exercise': Provide a structured, step-by-step guide on how to do the activity together.
       - If 'Prompt': Provide context, the main question, and 3 follow-up discussion questions.
    
    The content should be high-quality, actionable, and ready to consume immediately.`;

    try {
        // Generating detailed educational content using JSON structured output
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
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
                        }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return [];
    } catch (error) {
        console.error("Error generating module content:", error);
        return [];
    }
}