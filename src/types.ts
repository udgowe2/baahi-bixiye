export interface Ingredient {
  name: string;
  amount: string;
  isPantry: boolean;
}

export type RecipeMealTime = "breakfast" | "lunch" | "dinner" | "snack";
export type RecipeCategory = "komplett" | "gemuese" | "fleisch" | "staerke";

export interface Recipe {
  id: string;
  title: string;
  image?: string;
  prepTime?: string;
  mealTime?: RecipeMealTime;
  category?: RecipeCategory;
  ingredients: Ingredient[];
  instructions: string;
  tags: string[];
  sourceUrl?: string;
  createdAt?: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface PlannerSlot {
  id: string;
  dayIndex: number;
  mealType: MealType;
  recipeIds: string[]; // JSON array in DB
  helperName?: string;
  // These will be populated by the frontend or joined in the query
  recipes?: Recipe[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  isCompleted: boolean;
}

export interface DailyTask {
  id: string;
  dateStr: string;
  text: string;
  isCompleted: boolean;
  isSmartTask: boolean;
}

export const DAYS = [
  "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"
];

export const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: "breakfast", label: "Frühstück", icon: "🍳" },
  { id: "lunch", label: "Mittagessen", icon: "🥗" },
  { id: "dinner", label: "Abendessen", icon: "🍲" },
  { id: "snack", label: "Snack", icon: "🍎" },
];
