import React, { useState, useEffect } from "react";
import { Recipe, PlannerSlot, DAYS, MEAL_TYPES, MealType } from "../types";
import { User, Plus, X, CalendarCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getImageUrl } from "../utils/imageUrl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatUIDate, formatDateStr, addDays, getMonday } from "../utils/date";

interface MealSlotProps {
  dayIndex: number;
  mealType: MealType;
  slot?: PlannerSlot;
  onAddRequest: (dayIndex: number, mealType: MealType) => void;
  onRemoveRecipe: (dayIndex: number, mealType: MealType, recipeId: string) => void;
  onUpdateHelper: (dayIndex: number, mealType: MealType, helperName: string) => void;
  onClickRecipe?: (recipe: Recipe) => void;
}

const MealSlot: React.FC<MealSlotProps> = ({ dayIndex, mealType, slot, onAddRequest, onRemoveRecipe, onUpdateHelper, onClickRecipe }) => {
  const mealConfig = MEAL_TYPES.find(m => m.id === mealType);

  // Lokaler Entwurf: gespeichert wird erst beim Verlassen des Feldes,
  // nicht bei jedem Tastendruck (sonst ein Server-Request pro Buchstabe)
  const [helperDraft, setHelperDraft] = useState(slot?.helperName || "");
  useEffect(() => {
    setHelperDraft(slot?.helperName || "");
  }, [slot?.helperName]);

  const commitHelper = () => {
    if (helperDraft !== (slot?.helperName || "")) {
      onUpdateHelper(dayIndex, mealType, helperDraft);
    }
  };

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
                <div
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => onClickRecipe?.(recipe)}
                >
                  <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                    {recipe.image ? (
                      <img src={getImageUrl(recipe.image)} alt={recipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-300">N/A</div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-700 truncate flex-1 group-hover:text-indigo-600">{recipe.title}</span>
                </div>
                <button
                  onClick={() => onRemoveRecipe(dayIndex, mealType, recipe.id)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-red-500 md:text-gray-300 md:hover:text-red-500 transition-all flex-shrink-0"
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
                value={helperDraft}
                onChange={(e) => setHelperDraft(e.target.value)}
                onBlur={commitHelper}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="bg-transparent border-none focus:ring-0 p-0 text-[10px] text-gray-600 placeholder:text-gray-200 w-full"
              />
            </div>
          </div>
        )
      }

    </div >
  );
};

interface PlannerBoardProps {
  planner: PlannerSlot[];
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
  onAddRequest: (dayIndex: number, mealType: MealType) => void;
  onRemoveRecipe: (dayIndex: number, mealType: MealType, recipeId: string) => void;
  onUpdateHelper: (dayIndex: number, mealType: MealType, helperName: string) => void;
  onClickRecipe?: (recipe: Recipe) => void;
}

export const PlannerBoard: React.FC<PlannerBoardProps> = ({ planner, currentWeekStart, onWeekChange, onAddRequest, onRemoveRecipe, onUpdateHelper, onClickRecipe }) => {
  const todayStr = formatDateStr(new Date());
  const isCurrentWeek = formatDateStr(currentWeekStart) === formatDateStr(getMonday(new Date()));

  return (
    <div className="flex flex-col gap-8">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <button onClick={() => onWeekChange(addDays(currentWeekStart, -7))} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 text-sm font-bold text-gray-600">
          <ChevronLeft size={20} /> Vorherige
        </button>
        <div className="font-bold text-gray-800 tracking-wide text-center flex-1 flex items-center justify-center gap-3">
          <span>Woche vom {formatUIDate(currentWeekStart, "").replace(", ", "")}</span>
          {!isCurrentWeek && (
            <button
              onClick={() => onWeekChange(getMonday(new Date()))}
              className="flex items-center gap-1 text-xs px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full font-bold hover:bg-indigo-100 transition-colors"
            >
              <CalendarCheck size={12} /> Heute
            </button>
          )}
        </div>
        <button onClick={() => onWeekChange(addDays(currentWeekStart, 7))} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 text-sm font-bold text-gray-600">
          Nächste <ChevronRight size={20} />
        </button>
      </div>
      {DAYS.map((day, dayIndex) => {
        const currentDate = addDays(currentWeekStart, dayIndex);
        const dateHeader = formatUIDate(currentDate, day);
        const isToday = formatDateStr(currentDate) === todayStr;
        return (
        <div key={day} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h3 className={`font-serif italic text-2xl shrink-0 md:min-w-[200px] ${isToday ? "text-indigo-600 font-bold" : "text-gray-800"}`}>
              {dateHeader}
              {isToday && (
                <span className="ml-2 align-middle inline-block text-[10px] not-italic font-sans font-black uppercase tracking-widest bg-indigo-600 text-white px-2.5 py-1 rounded-full">
                  Heute
                </span>
              )}
            </h3>
            <div className={`h-px flex-1 ${isToday ? "bg-indigo-200" : "bg-gray-100"}`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MEAL_TYPES.map((meal) => {
              const targetDateStr = formatDateStr(addDays(currentWeekStart, dayIndex));
              const exactSlot = Array.isArray(planner) ? planner.find(p => p.dateStr === targetDateStr && p.mealType === meal.id) : undefined;
              const templateSlot = Array.isArray(planner) ? planner.find(p => !p.dateStr && p.dayIndex === dayIndex && p.mealType === meal.id) : undefined;
              return (
              <MealSlot
                key={meal.id}
                dayIndex={dayIndex}
                mealType={meal.id}
                slot={exactSlot || templateSlot}
                onAddRequest={onAddRequest}
                onRemoveRecipe={onRemoveRecipe}
                onUpdateHelper={onUpdateHelper}
                onClickRecipe={onClickRecipe}
              />
            )})}
          </div>
        </div>
      )})}
    </div>
  );
};
