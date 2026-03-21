import { GoogleGenAI, Type } from "@google/genai";
import axios from "axios";
import * as cheerio from "cheerio";

const url = "http://xawaash.com/?p=471";
const ai = new GoogleGenAI({ apiKey: "AIzaSyCbA172g2YxLpkWkG6XJAss7SwECF0ZWj0" });

async function test() {
    console.log(`[Test] Fetching URL: ${url}`);
    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(response.data);
    $('script, style, nav, footer, iframe, ads').remove();
    const pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000);

    console.log(`[Test] Parsed ${pageText.length} characters of DOM text. Sending to Gemini...`);


    const prompt = `Extract recipe data from the following text content of a webpage, translation it ALL into German (Deutsch):
  URL: ${url}
  Content: ${pageText}
  
  Return a JSON object with:
  - title: string (translated to German)
  - image: string (URL to the main recipe image if found)
  - prepTime: string (e.g. "30 Min", "1 Std", translated to German)
  - ingredients: array of { name: string, amount: string, isPantry: boolean }
    * Normalize ingredient names and translate them to German (e.g. "finely diced carrots" -> "Karotten")
    * Flag common pantry staples (salt, pepper, oil, flour, sugar, spices) as isPantry: true
  - instructions: string (markdown formatted, fully translated to German)
  - tags: array of strings (e.g. "Kinderfreundlich", "Vegetarisch", "Schnell", fully translated to German)`;

    try {
        const aiResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        image: { type: Type.STRING },
                        prepTime: { type: Type.STRING },
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
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "ingredients", "instructions", "tags"]
                }
            }
        });

        console.log("[Test] Received raw Gemini response:");
        console.log(aiResponse.text);
    } catch (e: any) {
        console.error("Gemini failed:", e.message || e);
    }
}

test();
