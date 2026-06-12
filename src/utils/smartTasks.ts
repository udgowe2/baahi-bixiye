import { PlannerSlot, Recipe, ShoppingItem, DailyTask } from "../types";
import { getTodayDateString } from "./date";

// Deterministische ID aus dem Text: derselbe Vorschlag bekommt immer dieselbe ID,
// damit doppelte Inserts (z.B. durch zwei parallele App-Starts) in der DB ins Leere laufen
function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// Deutsch, Englisch und Somali – die App generiert Rezepte in allen drei Sprachen
const MEAT_KEYWORDS = [
  "hähnchen", "huhn", "fleisch", "rind", "schwein", "lamm", "fisch", "lachs", "hackfleisch", "geschnetzeltes",
  "chicken", "beef", "meat", "lamb", "fish", "salmon", "shrimp", "mince",
  "hilib", "digaag", "kalluun", "ari", "lo'"
];

// "45 Min" -> 45, "1 Std" -> 60, "1,5 hours" -> 90, "30 daqiiqo" -> 30
export function parsePrepMinutes(prepTime?: string): number {
  if (!prepTime) return 0;
  const lower = prepTime.toLowerCase();
  const num = parseFloat(lower.replace(",", ".").match(/[\d.]+/)?.[0] || "0");
  if (/std|stunde|hour|saac|\bhrs?\b|\bh\b/.test(lower)) return num * 60;
  return num;
}

export function generateSmartTasks(
  tomorrowSlots: PlannerSlot[],
  shoppingItems: ShoppingItem[],
  existingTasks: DailyTask[]
): { tasksToAdd: DailyTask[], tasksToRemove: string[] } {
  const todayDateStr = getTodayDateString();

  const smartRecommendations: string[] = [];

  // Regel 1 & 2: Rezepte von morgen prüfen (Slots kommen bereits mit Rezepten vom Server)
  const tomorrowRecipes = tomorrowSlots.flatMap(s => s.recipes || []) as Recipe[];

  tomorrowRecipes.forEach(recipe => {
    if (parsePrepMinutes(recipe.prepTime) > 30) {
      smartRecommendations.push(`Morgen gibt es ${recipe.title} (Dauert ${recipe.prepTime}). Vielleicht heute schon etwas vorbereiten?`);
    }

    const hasMeat =
      recipe.tags.some(tag => MEAT_KEYWORDS.some(k => tag.toLowerCase().includes(k))) ||
      MEAT_KEYWORDS.some(k => recipe.title.toLowerCase().includes(k)) ||
      recipe.ingredients.some(ing => MEAT_KEYWORDS.some(k => ing.name.toLowerCase().includes(k)));

    if (hasMeat) {
      smartRecommendations.push(`Denk daran, das Fleisch/den Fisch für ${recipe.title} (morgen) aufzutauen!`);
    }
  });

  // Regel 3: Einkaufs-Erinnerung
  const pendingShopping = shoppingItems.filter(item => !item.isCompleted);
  if (pendingShopping.length > 0) {
    smartRecommendations.push(`${pendingShopping.length} Artikel stehen auf der Einkaufsliste. Hast du heute Zeit zum Einkaufen?`);
  }

  // Gegen vorhandene Aufgaben deduplizieren
  const newSmartTasks: DailyTask[] = [];
  const existingTaskTexts = new Set(existingTasks.map(t => t.text));

  smartRecommendations.forEach(text => {
    if (!existingTaskTexts.has(text)) {
      newSmartTasks.push({
        id: `smart-${todayDateStr}-${hashText(text)}`,
        dateStr: todayDateStr,
        text,
        isCompleted: false,
        isSmartTask: true
      });
    }
  });

  // Veraltete smarte Aufgaben aufräumen (stehen in der DB, sind aber nicht mehr empfohlen)
  const tasksToRemove: string[] = [];
  const recommendationSet = new Set(smartRecommendations);

  existingTasks.forEach(task => {
    if (task.isSmartTask && !recommendationSet.has(task.text)) {
      tasksToRemove.push(task.id);
    }
  });

  return { tasksToAdd: newSmartTasks, tasksToRemove };
}
