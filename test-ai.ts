import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCbA172g2YxLpkWkG6XJAss7SwECF0ZWj0" });

async function run() {
    try {
        console.log("Calling AI...");
        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Ein Rezept für Pizza",
            config: {
                systemInstruction: "You are a recipe generator.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        image: { type: Type.STRING, nullable: true },
                        prepTime: { type: Type.STRING, nullable: true },
                        ingredients: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    amount: { type: Type.STRING },
                                    isPantry: { type: Type.BOOLEAN }
                                },
                                required: ["name", "amount", "isPantry"]
                            }
                        },
                        instructions: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        englishSearchTerm: { type: Type.STRING, nullable: true },
                        mealTime: { type: Type.STRING, nullable: true },
                        category: { type: Type.STRING, nullable: true }
                    },
                    required: ["title", "ingredients", "instructions", "tags"]
                }
            }
        });
        console.log("Response:", aiResponse.text);
    } catch (err: any) {
        console.error("ERROR CAUGHT:");
        console.error("Message:", err.message);
        console.error("Status:", err.status);
        console.error("Details:", JSON.stringify(err, null, 2));
    }
}

run();
