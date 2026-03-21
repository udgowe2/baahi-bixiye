import React from "react";
import { Recipe, PlannerSlot, DAYS, MEAL_TYPES, MealType } from "../types";
import { User, Star, Trash2, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getImageUrl } from "../utils/imageUrl";

interface MealSlotProps {
  dayIndex: number;
  mealType: MealType;
  slot?: PlannerSlot;
  onAddRequest: (dayIndex: number, mealType: MealType) => void;
  onRemoveRecipe: (dayIndex: number, mealType: MealType, recipeId: string) => void;
  onUpdateHelper: (dayIndex: number, mealType: MealType, helperName: string) => void;
}

const MealSlot: React.FC<MealSlotProps> = ({ dayIndex, mealType, slot, onAddRequest, onRemoveRecipe, onUpdateHelper }) => {
  const mealConfig = MEAL_TYPES.find(m => m.id === mealType);

  return (
    <div
      className={`
        relative flex flex-col gap-2 p-3 rounded-xl border-2 transition-all duration-300 min-h-[120px] 
        ${(slot?.recipes && slot.recipes.length > 0) ? "border-transparent bg-white shadow-sm" : "border-dashed border-gray-200 bg-white/50"}
      `}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{mealConfig?.icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{mealConfig?.label}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {slot?.recipes && slot.recipes.length > 0 ? (
            slot.recipes.map((recipe) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100"
              >
                <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                  {recipe.image ? (
                    <img src={getImageUrl(recipe.image)} alt={recipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-300">N/A</div>
                  )}
                </div>
                <span className="text-xs font-bold text-gray-700 truncate flex-1">{recipe.title}</span>
                <button
                  onClick={() => onRemoveRecipe(dayIndex, mealType, recipe.id)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-red-500 md:text-gray-300 md:hover:text-red-500 transition-all"
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))
          ) : null}
        </AnimatePresence>

        {(!slot?.recipes || slot.recipes.length === 0) && (
          <button
            onClick={() => onAddRequest(dayIndex, mealType)}
            className="flex-1 min-h-[60px] flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-all border border-transparent hover:border-indigo-100 group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center shadow-sm">
              <Plus size={16} className="text-gray-400 group-hover:text-indigo-500" />
            </div>
            <span className="text-[10px] font-bold">Rezept hinzufügen</span>
          </button>
        )}
      </div>

      {slot?.recipes && slot.recipes.length > 0 && (
        <button
          onClick={() => onAddRequest(dayIndex, mealType)}
          className="w-full mt-1 py-1.5 border border-dashed border-gray-200 rounded-lg text-[10px] font-bold text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1"
        >
          <Plus size={12} /> Weiteres hinzufügen
        </button>
      )}

      {
        slot?.recipes && slot.recipes.length > 0 && (
          <div className="mt-auto pt-2 border-t border-gray-50 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <User size={10} className="text-indigo-300" />
              <input
                type="text"
                placeholder="Helfer..."
                value={slot.helperName || ""}
                onChange={(e) => onUpdateHelper(dayIndex, mealType, e.target.value)}
                className="bg-transparent border-none focus:ring-0 p-0 text-[10px] text-gray-600 placeholder:text-gray-200 w-full"
              />
            </div>
            <div className="flex gap-0.5 text-gray-100">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={10} />
              ))}
            </div>
          </div>
        )
      }

    </div >
  );
};

interface PlannerBoardProps {
  planner: PlannerSlot[];
  onAddRequest: (dayIndex: number, mealType: MealType) => void;
  onRemoveRecipe: (dayIndex: number, mealType: MealType, recipeId: string) => void;
  onUpdateHelper: (dayIndex: number, mealType: MealType, helperName: string) => void;
}

export const PlannerBoard: React.FC<PlannerBoardProps> = ({ planner, onAddRequest, onRemoveRecipe, onUpdateHelper }) => {
  return (
    <div className="flex flex-col gap-8">
      {DAYS.map((day, dayIndex) => (
        <div key={day} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-serif italic text-2xl text-gray-800 shrink-0 md:min-w-[140px]">{day}</h3>
            <div className="h-px bg-gray-100 flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MEAL_TYPES.map((meal) => (
              <MealSlot
                key={meal.id}
                dayIndex={dayIndex}
                mealType={meal.id}
                slot={Array.isArray(planner) ? planner.find((p) => p.dayIndex === dayIndex && p.mealType === meal.id) : undefined}
                onAddRequest={onAddRequest}
                onRemoveRecipe={onRemoveRecipe}
                onUpdateHelper={onUpdateHelper}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
