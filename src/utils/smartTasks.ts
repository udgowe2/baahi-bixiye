import { PlannerSlot, Recipe, ShoppingItem, DailyTask } from "../types";

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function generateSmartTasks(
  planner: PlannerSlot[], 
  recipes: Recipe[], 
  shoppingItems: ShoppingItem[],
  existingTasks: DailyTask[]
): { tasksToAdd: DailyTask[], tasksToRemove: string[] } {
  const todayDateStr = getTodayDateString();
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  const tomorrowIndex = (nextDay.getDay() + 6) % 7;
  
  const smartRecommendations: string[] = [];

  // Rule 1 & 2: Check tomorrow's recipes
  const tomorrowSlots = planner.filter(p => p.dayIndex === tomorrowIndex);
  const tomorrowRecipeIds = tomorrowSlots.flatMap(s => s.recipeIds);
  const tomorrowRecipes = tomorrowRecipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) as Recipe[];

  tomorrowRecipes.forEach(recipe => {
    // Prep time > 30 mins
    if (recipe.prepTime && parseInt(recipe.prepTime) > 30) {
        smartRecommendations.push(`Morgen gibt es ${recipe.title} (Dauert ${recipe.prepTime}). Vielleicht heute schon etwas vorbereiten?`);
    }

    // Defrost warning based on meat/fish tags or title
    const meatKeywords = ["hähnchen", "fleisch", "rind", "schwein", "fisch", "lachs", "hackfleisch", "geschnetzeltes"];
    const hasMeat = 
        recipe.tags.some(tag => meatKeywords.some(k => tag.toLowerCase().includes(k))) ||
        meatKeywords.some(k => recipe.title.toLowerCase().includes(k)) ||
        recipe.ingredients.some(ing => meatKeywords.some(k => ing.name.toLowerCase().includes(k)));

    if (hasMeat) {
        smartRecommendations.push(`Denk daran, das Fleisch/den Fisch für ${recipe.title} (morgen) aufzutauen!`);
    }
  });

  // Rule 3: Shopping reminder
  const pendingShopping = shoppingItems.filter(item => !item.isCompleted);
  if (pendingShopping.length > 0) {
      smartRecommendations.push(`${pendingShopping.length} Artikel stehen auf der Einkaufsliste. Hast du heute Zeit zum Einkaufen?`);
  }

  // Deduplicate against existing tasks
  const newSmartTasks: DailyTask[] = [];
  const existingTaskTexts = new Set(existingTasks.map(t => t.text));

  smartRecommendations.forEach(text => {
      if (!existingTaskTexts.has(text)) {
          newSmartTasks.push({
              id: `smart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              dateStr: todayDateStr,
              text,
              isCompleted: false,
              isSmartTask: true
          });
      }
  });

  // Find obsolete smart tasks (those that exist in DB, are smart tasks, but are no longer in our recommendations list)
  const tasksToRemove: string[] = [];
  const recommendationSet = new Set(smartRecommendations);
  
  existingTasks.forEach(task => {
      // Only clean up smart tasks that haven't been completed yet. 
      // Completed ones we might just leave as a record, or delete - your call. Let's delete if obsolete.
      if (task.isSmartTask && !recommendationSet.has(task.text)) {
          tasksToRemove.push(task.id);
      }
  });

  return { tasksToAdd: newSmartTasks, tasksToRemove };
}
