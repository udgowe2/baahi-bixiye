import React from "react";
import { Recipe, RecipeMealTime, RecipeCategory } from "../types";
import { RecipeCard, MEAL_TIME_LABELS, CATEGORY_LABELS } from "./RecipeCard";
import { Search, Plus, Sparkles } from "lucide-react";

interface RecipeBankProps {
  recipes: Recipe[];
  onDelete: (id: string) => void;
  onEdit: (recipe: Recipe) => void;
  onClickRecipe: (recipe: Recipe) => void;
  onGenerate: (prompt: string) => void;
  onCreateManual: () => void;
  isGenerating: boolean;
}

export const RecipeBank: React.FC<RecipeBankProps> = ({ recipes, onDelete, onEdit, onClickRecipe, onGenerate, onCreateManual, isGenerating }) => {
  const [prompt, setPrompt] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeMealTime, setActiveMealTime] = React.useState<RecipeMealTime | "">("");
  const [activeCategory, setActiveCategory] = React.useState<RecipeCategory | "">("");

  const filteredRecipes = recipes.filter(r => {
    const activeTags = r.tags || [];
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || activeTags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesMealTime = activeMealTime === "" || r.mealTime === activeMealTime;
    const matchesCategory = activeCategory === "" || r.category === activeCategory;
    return matchesSearch && matchesMealTime && matchesCategory;
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt.trim());
      setPrompt("");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* AI Generator Section */}
      <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-indigo-800">
              <Sparkles size={24} className="text-indigo-500" />
              <h3 className="font-bold font-serif text-xl">Lass dich inspirieren!</h3>
          </div>
          <p className="text-sm text-indigo-600/80">
              Beschreibe einfach, worauf du Lust hast oder welche Zutaten weg müssen. Die KI kreiert ein passendes Rezept für dich.
          </p>
          <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-4 items-start md:items-stretch">
              <div className="relative flex-1 w-full">
                  <textarea
                      placeholder="z.B. Ich habe 500g Hackfleisch und Karotten. Mach was Schnelles für Kinder..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isGenerating}
                      className="w-full pl-4 pr-10 py-3 bg-white border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm min-h-[100px] resize-none text-gray-700 disabled:opacity-50"
                      required
                  />
                  {isGenerating && (
                      <div className="absolute right-4 top-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                      </div>
                  )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                  <button
                      type="submit"
                      disabled={isGenerating || !prompt.trim()}
                      className="px-6 py-4 h-full bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                      {isGenerating ? "Denkt nach..." : "Rezept generieren"}
                  </button>
              </div>
          </form>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <button
                onClick={onCreateManual}
                className="w-full md:w-auto px-6 py-3 bg-white border-2 border-gray-100 text-gray-700 rounded-full font-bold hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
            >
                <Plus size={20} />
                Eigenes Rezept eintragen
            </button>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Deine Rezepte durchsuchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-100 rounded-full focus:ring-4 focus:ring-gray-100 focus:border-gray-200 text-sm transition-all"
              />
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2 min-w-[80px]">Mahlzeit:</span>
                <button 
                    onClick={() => setActiveMealTime("")} 
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${activeMealTime === "" ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                >
                    Alle
                </button>
                {(Object.entries(MEAL_TIME_LABELS) as [RecipeMealTime, {label: string, icon: string}][]).map(([key, {label, icon}]) => (
                    <button
                        key={key}
                        onClick={() => setActiveMealTime(key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${activeMealTime === key ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                    >
                        <span>{icon}</span> {label}
                    </button>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2 min-w-[80px]">Kategorie:</span>
                <button 
                    onClick={() => setActiveCategory("")} 
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${activeCategory === "" ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                >
                    Alle
                </button>
                {(Object.entries(CATEGORY_LABELS) as [RecipeCategory, {label: string, icon: string}][]).map(([key, {label, icon}]) => (
                    <button
                        key={key}
                        onClick={() => setActiveCategory(key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${activeCategory === key ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                    >
                        <span>{icon}</span> {label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 mt-4">
        {filteredRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onDelete={onDelete} onEdit={onEdit} onClick={onClickRecipe} />
        ))}
        {filteredRecipes.length === 0 && !isGenerating && (
          <div className="col-span-full py-20 text-center text-gray-400 italic">
            Keine Rezepte gefunden. Generiere eins oder lege eins manuell an!
          </div>
        )}
      </div>
    </div >
  );
};
