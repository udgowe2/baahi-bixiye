import React, { useState, useEffect } from "react";
import { Recipe, PlannerSlot, DAYS, MealType, ShoppingItem, MEAL_TYPES, DailyTask } from "./types";
import { getTodayDateString, generateSmartTasks } from "./utils/smartTasks";
import { RecipeBank } from "./components/RecipeBank";
import { PlannerBoard } from "./components/PlannerBoard";
import { ShoppingList } from "./components/ShoppingList";
import { Overview } from "./components/Overview";
import { PrintView } from "./components/PrintView";
import { RecipeCard } from "./components/RecipeCard";
import { RecipeForm } from "./components/RecipeForm";
import { RecipePickerModal } from "./components/RecipePickerModal";
import { RecipeDetailsModal } from "./components/RecipeDetailsModal";
import { TasksPage } from "./components/TasksPage";
import { ChefHat, ShoppingBag, Calendar, Printer, Sparkles, Home, ListTodo, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "./context/ThemeContext";

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [planner, setPlanner] = useState<PlannerSlot[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null | "new">(null);
  const [activeTab, setActiveTab] = useState<"overview" | "planner" | "shopping" | "recipes" | "tasks">("overview");
  const [pickerTarget, setPickerTarget] = useState<{ dayIndex: number; mealType: MealType } | null>(null);

  useEffect(() => {
    fetchRecipes();
    fetchPlanner();
    fetchShoppingItems();
    fetchTasks();
  }, []);

  const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001`;

  const fetchRecipes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/recipes`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecipes(data);
      }
    } catch (err) {
      console.error("Failed to fetch recipes:", err);
    }
  };

  const fetchPlanner = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/planner`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlanner(data);
      }
    } catch (err) {
      console.error("Failed to fetch planner:", err);
    }
  };

  const fetchShoppingItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/shopping`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setShoppingItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch shopping items:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const today = getTodayDateString();
      const res = await fetch(`${API_BASE}/api/tasks?date=${today}`);
      const existingTasks: DailyTask[] = await res.json();
      
      if (Array.isArray(existingTasks)) {
          setDailyTasks(existingTasks);
      }

    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  // Keep a ref or use effect dependency to run smart sync when core data is loaded
  useEffect(() => {
     if (planner.length > 0 || recipes.length > 0 || shoppingItems.length > 0) {
        syncSmartTasks();
     }
  }, [planner, recipes, shoppingItems]);

  const syncSmartTasks = async () => {
      const today = getTodayDateString();
      const { tasksToAdd, tasksToRemove } = generateSmartTasks(planner, recipes, shoppingItems, dailyTasks);
      
      let didChange = false;

      // 1. Remove obsolete tasks
      if (tasksToRemove.length > 0) {
          try {
              await fetch(`${API_BASE}/api/tasks/smart-sync-cleanup`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ taskIds: tasksToRemove })
              });
              didChange = true;
          } catch (err) {
              console.error("Failed to clean up smart tasks:", err);
          }
      }

      // 2. Add new tasks (only if not already flooded)
      if (tasksToAdd.length > 0) {
          try {
              await fetch(`${API_BASE}/api/tasks/smart-sync`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ dateStr: today, tasks: tasksToAdd })
              });
              didChange = true;
          } catch (err) {
              console.error("Failed to sync smart tasks:", err);
          }
      }

      if (didChange) {
          fetchTasks();
      }
  };

  const handleAddTask = async (text: string) => {
    const today = getTodayDateString();
    const newTask = {
        id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        dateStr: today,
        text,
        isCompleted: false,
        isSmartTask: false
    };

    await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
    });
    fetchTasks();
  };

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted })
    });
    fetchTasks();
  };

  const handleDeleteTask = async (id: string) => {
      await fetch(`${API_BASE}/api/tasks/${id}`, { method: "DELETE" });
      fetchTasks();
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    try {
      const res = await fetch(`${API_BASE}/api/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText}`);
      }

      setEditingRecipe(null);
      fetchRecipes();
      fetchPlanner();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Speichern des Rezepts.");
    }
  };

  const handleAddShoppingItem = async (name: string, amount: string) => {
    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      amount,
      isCompleted: false
    };
    await fetch(`${API_BASE}/api/shopping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    fetchShoppingItems();
  };

  const handleToggleShoppingItem = async (id: string, isCompleted: boolean) => {
    await fetch(`${API_BASE}/api/shopping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted }),
    });
    fetchShoppingItems();
  };

  const handleDeleteShoppingItem = async (id: string) => {
    await fetch(`${API_BASE}/api/shopping/${id}`, { method: "DELETE" });
    fetchShoppingItems();
  };

  const handleGenerateRecipe = async (prompt: string) => {
    setIsImporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const textData = await res.text();
      let data;
      try {
        data = JSON.parse(textData);
      } catch (e) {
        throw new Error(`Server hat kein JSON gesendet (Läuft Node.js?): ${textData.substring(0, 100)}...`);
      }
      
      if (data.error) throw new Error(data.error);

      // Instantly open the recipe form with the AI's data
      setEditingRecipe(data);
    } catch (err: any) {
      console.error("[Generator Error Details]:", err);
      alert(`Fehler beim Generieren des Rezepts: ${err.message || "Unbekannter Fehler"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (confirm("Möchtest du dieses Rezept wirklich löschen?")) {
      await fetch(`${API_BASE}/api/recipes/${id}`, { method: "DELETE" });
      fetchRecipes();
      fetchPlanner(); // Refresh planner in case it was used
    }
  };

  const handleRemoveRecipeFromPlanner = async (dayIndex: number, mealType: MealType, recipeId: string) => {
    const slot = planner.find(p => p.dayIndex === dayIndex && p.mealType === mealType);
    if (slot) {
      const updatedRecipeIds = slot.recipeIds.filter(id => id !== recipeId);
      await fetch(`${API_BASE}/api/planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayIndex, mealType, recipeIds: updatedRecipeIds, helperName: slot.helperName }),
      });
      fetchPlanner();
    }
  };

  const handleUpdateHelper = async (dayIndex: number, mealType: MealType, helperName: string) => {
    const slot = planner.find(p => p.dayIndex === dayIndex && p.mealType === mealType);
    await fetch(`${API_BASE}/api/planner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayIndex, mealType, recipeIds: slot?.recipeIds || [], helperName }),
    });
    fetchPlanner();
  };

  const handleRecipePicked = async (recipe: Recipe) => {
    if (!pickerTarget) return;

    const { dayIndex, mealType } = pickerTarget;
    const slot = planner.find(p => p.dayIndex === dayIndex && p.mealType === mealType);
    const currentRecipeIds = slot?.recipeIds || [];

    if (!currentRecipeIds.includes(recipe.id)) {
      const updatedRecipeIds = [...currentRecipeIds, recipe.id];
      await fetch(`${API_BASE}/api/planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayIndex, mealType, recipeIds: updatedRecipeIds, helperName: slot?.helperName || "" }),
      });
      fetchPlanner();
    }

    setPickerTarget(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 overflow-hidden shrink-0">
              <img src="/logo.png" alt="Baahi Bixiye Logo" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:flex flex-col justify-center">
              <p className="text-xs text-indigo-400/80 font-black uppercase tracking-[0.2em] leading-tight">Maxaa la cunaa?</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 bg-gray-100 p-1 rounded-full">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "overview" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <Home size={18} />
              Übersicht
            </button>
            <button
              onClick={() => setActiveTab("planner")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "planner" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <Calendar size={18} />
              Planer
            </button>
            <button
              onClick={() => setActiveTab("shopping")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "shopping" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <ShoppingBag size={18} />
              Einkauf
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "tasks" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <ListTodo size={18} />
              Aufgaben
            </button>
            <button
              onClick={() => setActiveTab("recipes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "recipes" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <ChefHat size={18} />
              Rezepte
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-all shadow-sm"
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setShowPrintView(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Woche drucken</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8 sm:gap-12 pb-32 md:pb-8 print:hidden">
        {/* Main Content Sections */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.section
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <Overview
                planner={planner}
                recipes={recipes}
                tasks={dailyTasks}
                shoppingItems={shoppingItems}
                onSwitchTab={setActiveTab}
                onClickRecipe={setActiveRecipe}
              />
            </motion.section>
          )}

          {activeTab === "tasks" && (
            <motion.section
              key="tasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <TasksPage
                tasks={dailyTasks}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
              />
            </motion.section>
          )}

          {activeTab === "planner" && (
            <motion.section
              key="planner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-serif font-bold text-gray-800 flex items-center gap-3">
                  Wochenplan
                  <Sparkles className="text-indigo-400" size={24} />
                </h2>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Empty Sidebar removed because of PickerModal overlay approach. Using full width. */}

                <div className="flex-1">
                  <PlannerBoard
                    planner={planner}
                    onAddRequest={(dayIndex, mealType) => setPickerTarget({ dayIndex, mealType })}
                    onRemoveRecipe={handleRemoveRecipeFromPlanner}
                    onUpdateHelper={handleUpdateHelper}
                  />
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === "shopping" && (
            <motion.section
              key="shopping"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <ShoppingList
                planner={planner}
                recipes={recipes}
                manualItems={shoppingItems}
                onAddManualItem={handleAddShoppingItem}
                onToggleManualItem={handleToggleShoppingItem}
                onDeleteManualItem={handleDeleteShoppingItem}
              />
            </motion.section>
          )}

          {activeTab === "recipes" && (
            <motion.section
              key="recipes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-serif font-bold text-gray-800">Rezept-Sammlung</h2>
                <div className="text-sm text-gray-400 font-medium italic">
                  Verwalte deine Rezepte und importiere neue
                </div>
              </div>
              <RecipeBank
                recipes={recipes}
                onDelete={handleDeleteRecipe}
                onEdit={(r) => setEditingRecipe(r)}
                onClickRecipe={(r) => setActiveRecipe(r)}
                onGenerate={handleGenerateRecipe}
                onCreateManual={() => setEditingRecipe("new")}
                isGenerating={isImporting}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Recipe Picker Modal */}
      {pickerTarget && (
        <RecipePickerModal
          recipes={recipes}
          onSelect={handleRecipePicked}
          onClose={() => setPickerTarget(null)}
          dayName={DAYS[pickerTarget.dayIndex]}
          mealName={MEAL_TYPES.find(m => m.id === pickerTarget.mealType)?.label || ""}
        />
      )}

      {/* Recipe Details Modal */}
      {activeRecipe && (
        <RecipeDetailsModal
          recipe={activeRecipe}
          onClose={() => setActiveRecipe(null)}
        />
      )}

      {/* Recipe Form Modal */}
      {editingRecipe && (
        <RecipeForm
          recipe={editingRecipe === "new" ? undefined : editingRecipe}
          onSave={handleSaveRecipe}
          onClose={() => setEditingRecipe(null)}
        />
      )}

      {/* Print View Modal */}
      {showPrintView && (
        <PrintView
          planner={planner}
          recipes={recipes}
          onClose={() => setShowPrintView(false)}
        />
      )}
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-200 px-6 py-3 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] print:hidden">
        <div className="flex items-center justify-between gap-2 max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-bold transition-all flex-1 ${activeTab === "overview" ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
              }`}
          >
            <Home size={22} />
            <span>Übersicht</span>
          </button>
          <button
            onClick={() => setActiveTab("planner")}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-bold transition-all flex-1 ${activeTab === "planner" ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
              }`}
          >
            <Calendar size={22} />
            <span>Planer</span>
          </button>
          <button
            onClick={() => setActiveTab("shopping")}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-bold transition-all flex-1 ${activeTab === "shopping" ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
              }`}
          >
            <ShoppingBag size={22} />
            <span>Einkauf</span>
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-bold transition-all flex-1 ${activeTab === "tasks" ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
              }`}
          >
            <ListTodo size={22} />
            <span>Aufgaben</span>
          </button>
          <button
            onClick={() => setActiveTab("recipes")}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-bold transition-all flex-1 ${activeTab === "recipes" ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-gray-600"
              }`}
          >
            <ChefHat size={22} />
            <span>Rezepte</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 border-t border-gray-100 mt-8 md:mt-12 text-center pb-24 md:pb-12">
        <p className="text-gray-400 text-sm font-medium">
          Baahi Bixiye &copy; {new Date().getFullYear()} &bull; Mit ❤️ für die Familie gebaut
        </p>
      </footer>
    </div>
  );
}
