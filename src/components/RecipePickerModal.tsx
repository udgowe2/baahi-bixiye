import React, { useState } from "react";
import { Recipe, RecipeMealTime, RecipeCategory } from "../types";
import { X, Search } from "lucide-react";
import { getImageUrl } from "../utils/imageUrl";
import { MEAL_TIME_LABELS, CATEGORY_LABELS } from "./RecipeCard";

interface RecipePickerModalProps {
    recipes: Recipe[];
    onSelect: (recipe: Recipe) => void;
    onClose: () => void;
    dayName: string;
    mealName: string;
}

export const RecipePickerModal: React.FC<RecipePickerModalProps> = ({ recipes, onSelect, onClose, dayName, mealName }) => {
    const [search, setSearch] = useState("");
    const [activeMealTime, setActiveMealTime] = useState<RecipeMealTime | "">("");
    const [activeCategory, setActiveCategory] = useState<RecipeCategory | "">("");

    const filteredRecipes = recipes.filter(r => {
        const activeTags = r.tags || [];
        const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || activeTags.some(t => t.toLowerCase().includes(search.toLowerCase()));
        const matchesMealTime = activeMealTime === "" || r.mealTime === activeMealTime;
        const matchesCategory = activeCategory === "" || r.category === activeCategory;
        return matchesSearch && matchesMealTime && matchesCategory;
    });

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-gray-800">
                            Rezept auswählen
                        </h2>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                            Für {dayName} - {mealName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 bg-white flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rezepte durchsuchen..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-sm"
                        />
                    </div>
                    {/* Filters */}
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2 min-w-[70px]">Mahlzeit:</span>
                            <button 
                                onClick={() => setActiveMealTime("")} 
                                className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors ${activeMealTime === "" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                Alle
                            </button>
                            {(Object.entries(MEAL_TIME_LABELS) as [RecipeMealTime, {label: string, icon: string}][]).map(([key, {label, icon}]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveMealTime(key)}
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors flex items-center gap-1 ${activeMealTime === key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                >
                                    <span>{icon}</span> {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2 min-w-[70px]">Kategorie:</span>
                            <button 
                                onClick={() => setActiveCategory("")} 
                                className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors ${activeCategory === "" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                Alle
                            </button>
                            {(Object.entries(CATEGORY_LABELS) as [RecipeCategory, {label: string, icon: string}][]).map(([key, {label, icon}]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveCategory(key)}
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors flex items-center gap-1 ${activeCategory === key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                >
                                    <span>{icon}</span> {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredRecipes.map((recipe) => (
                            <button
                                key={recipe.id}
                                onClick={() => onSelect(recipe)}
                                className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                    {recipe.image ? (
                                        <img src={getImageUrl(recipe.image)} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300">N/A</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-800 truncate">{recipe.title}</h4>
                                    <div className="flex gap-1 mt-1 truncate">
                                        {(recipe.tags || []).slice(0, 2).map(tag => (
                                            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-wider truncate">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ))}
                        {filteredRecipes.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-400 italic text-sm">
                                Keine Rezepte gefunden.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
