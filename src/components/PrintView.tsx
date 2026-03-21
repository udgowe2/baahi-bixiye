import React from "react";
import { PlannerSlot, DAYS, Recipe, MEAL_TYPES } from "../types";
import { User, Printer, X } from "lucide-react";

interface PrintViewProps {
  planner: PlannerSlot[];
  recipes: Recipe[];
  onClose: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ planner, recipes, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto print:static print:block print:h-auto print:overflow-visible print:p-0">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 print:p-0 print:max-w-none print:m-0">

        {/* On-Screen Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
          <div className="flex flex-col">
            <h1 className="text-2xl font-serif font-bold text-gray-800">Baahi Bixiye Wochenplan</h1>
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Kompakte Ansicht (A4 Querformat)</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all shadow-md"
            >
              <Printer size={20} />
              Jetzt drucken
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-gray-600 rounded-full font-bold hover:bg-gray-200 transition-all"
            >
              <X size={20} />
              Schließen
            </button>
          </div>
        </div>

        {/* Print Layout */}
        <div className="print-container bg-white flex flex-col gap-4 min-h-[90vh]">
          <div className="text-center border-b border-gray-800 pb-2 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-serif font-black text-gray-900 uppercase tracking-tighter leading-none">Baahi Bixiye</h1>
              <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest text-left mt-1">Wochenmenü & Helfer</p>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              Generiert am {new Date().toLocaleDateString('de-DE')}
            </div>
          </div>

          <div className="border border-gray-800 rounded-sm overflow-hidden flex-1 flex flex-col">
            {/* Table Header Row */}
            <div className="grid grid-cols-5 bg-gray-100 border-b border-gray-800">
              <div className="p-2 border-r border-gray-800 font-bold text-xs uppercase text-gray-600 tracking-wider">Tag</div>
              {MEAL_TYPES.map(meal => (
                <div key={meal.id} className="p-2 border-r border-gray-800 font-bold text-xs uppercase text-gray-800 flex items-center gap-1.5 last:border-r-0">
                  <span>{meal.icon}</span>
                  {meal.label}
                </div>
              ))}
            </div>

            {/* Table Body Rows - using flex-1 to stretch and fill available space */}
            <div className="flex flex-col flex-1">
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="grid grid-cols-5 border-b border-gray-300 last:border-b-0 flex-1 h-full">
                  {/* Day Column */}
                  <div className="p-2 border-r border-gray-800 bg-gray-50 flex items-center">
                    <h2 className="text-sm font-serif font-bold text-gray-900">{day}</h2>
                  </div>

                  {/* Meal Columns */}
                  {MEAL_TYPES.map(meal => {
                    const slot = Array.isArray(planner) ? planner.find(p => p.dayIndex === dayIndex && p.mealType === meal.id) : null;
                    const mealRecipes = slot?.recipeIds?.map(id => recipes.find(r => r.id === id)).filter(Boolean) || [];

                    return (
                      <div key={meal.id} className="p-2 border-r border-gray-300 last:border-r-0 min-h-[60px] h-full flex flex-col justify-start">
                        {mealRecipes.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {mealRecipes.map(recipe => (
                              <div key={recipe?.id} className="flex flex-col leading-tight">
                                <span className="text-xs font-bold text-gray-900">{recipe?.title}</span>
                              </div>
                            ))}

                            {slot?.helperName && (
                              <div className="mt-auto border-t border-dotted border-gray-300 pt-1 flex items-center gap-1 text-[9px] font-bold text-indigo-700">
                                <User size={10} />
                                <span className="uppercase">{slot.helperName}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[10px] text-gray-300 italic opacity-50">-</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-[9px] text-gray-400 font-mono mt-auto">
            Baahi Bixiye © {new Date().getFullYear()} • Mit ❤ für die Familie gebaut
          </div>
        </div>
      </div>
    </div>
  );
};
