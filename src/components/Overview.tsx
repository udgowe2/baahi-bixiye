import React from "react";
import { PlannerSlot, Recipe, DAYS, MEAL_TYPES, DailyTask, ShoppingItem } from "../types";
import { motion } from "motion/react";
import { User, Clock, ChefHat, ArrowRight, ShoppingBag, ListTodo, CheckCircle2 } from "lucide-react";
import { getImageUrl } from "../utils/imageUrl";

interface OverviewProps {
  planner: PlannerSlot[];
  recipes: Recipe[];
  tasks?: DailyTask[];
  shoppingItems?: ShoppingItem[];
  onSwitchTab: (tab: "overview" | "planner" | "shopping" | "recipes" | "tasks") => void;
  onClickRecipe?: (recipe: Recipe) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  planner,
  recipes,
  tasks = [],
  shoppingItems = [],
  onSwitchTab,
  onClickRecipe,
}) => {
  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayName = DAYS[todayIndex];

  const todayMeals = MEAL_TYPES.map(mealType => {
    const slot = Array.isArray(planner) ? planner.find(p => p.dayIndex === todayIndex && p.mealType === mealType.id) : null;
    const mealRecipes = slot?.recipeIds?.map(id => recipes.find(r => r.id === id)).filter(Boolean) as Recipe[] || [];
    return { ...mealType, recipes: mealRecipes, helper: slot?.helperName };
  });

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const pendingTasks = tasks.filter(t => !t.isCompleted).length;
  const pendingShopping = shoppingItems.filter(i => !i.isCompleted).length;

  return (
    <div className="flex flex-col gap-10">
      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-serif font-black text-gray-900 tracking-tight">
            Schönen {todayName}! 👋
          </h2>
          <p className="text-gray-500 font-medium mt-1">Hier ist der Menüplan für heute.</p>
        </div>
        <button
          onClick={() => onSwitchTab("planner")}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm self-start"
        >
          Ganze Woche <ArrowRight size={16} />
        </button>
      </div>

      {/* Today's Meals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {todayMeals.map((meal, idx) => (
          <motion.div
            key={meal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{meal.icon}</span>
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600">{meal.label}</span>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              {meal.recipes.length > 0 ? (
                meal.recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className={`flex flex-col gap-3 ${onClickRecipe ? "cursor-pointer" : ""}`}
                    onClick={() => onClickRecipe?.(recipe)}
                  >
                    <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 relative">
                      {recipe.image ? (
                        <img
                          src={getImageUrl(recipe.image)}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ChefHat size={32} />
                        </div>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-base text-gray-800 leading-tight">
                      {recipe.title}
                    </h3>
                    {recipe.prepTime && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} /> {recipe.prepTime}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
                    <ChefHat size={20} />
                  </div>
                  <p className="text-gray-400 text-xs italic">Nichts geplant</p>
                </div>
              )}
            </div>

            {meal.helper && (
              <div className="mt-auto pt-3 border-t border-gray-50 flex items-center gap-2 text-xs font-bold text-indigo-600">
                <User size={12} />
                <span>Sous-Chef: {meal.helper}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Tasks Summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => onSwitchTab("tasks")}
          className="cursor-pointer bg-indigo-900 rounded-3xl p-6 text-white flex items-center gap-5 hover:bg-indigo-800 transition-all shadow-xl shadow-indigo-200 group"
        >
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-all">
            <ListTodo size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-indigo-300 text-xs font-black uppercase tracking-widest mb-1">Aufgaben</p>
            <p className="text-3xl font-black text-white">{pendingTasks}</p>
            <p className="text-indigo-300 text-sm mt-0.5">
              offen · {completedTasks} erledigt
            </p>
          </div>
          <ArrowRight size={20} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
        </motion.div>

        {/* Shopping Summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => onSwitchTab("shopping")}
          className="cursor-pointer bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md hover:border-emerald-100 transition-all group"
        >
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0 group-hover:bg-emerald-100 transition-all">
            <ShoppingBag size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Einkaufsliste</p>
            <p className="text-3xl font-black text-gray-900">{pendingShopping}</p>
            <p className="text-gray-400 text-sm mt-0.5">
              {pendingShopping === 1 ? "Artikel ausstehend" : "Artikel ausstehend"}
            </p>
          </div>
          <ArrowRight size={20} className="text-gray-300 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
        </motion.div>

      </div>
    </div>
  );
};
