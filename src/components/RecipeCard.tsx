import React from "react";
import { Recipe } from "../types";
import { Clock, ExternalLink, Trash2, Plus, Edit2 } from "lucide-react";
import { motion } from "motion/react";
import { getImageUrl } from "../utils/imageUrl";
interface RecipeCardProps {
  recipe: Recipe;
  onDelete?: (id: string) => void;
  onEdit?: (recipe: Recipe) => void;
  onAddToPlanner?: (recipe: Recipe) => void;
  onClick?: (recipe: Recipe) => void;
  isDraggable?: boolean;
}

export const MEAL_TIME_LABELS: Record<string, { label: string, icon: string }> = {
  breakfast: { label: "Frühstück", icon: "🍳" },
  lunch: { label: "Mittagessen", icon: "🥗" },
  dinner: { label: "Abendessen", icon: "🍲" },
  snack: { label: "Snack", icon: "🍎" },
};

export const CATEGORY_LABELS: Record<string, { label: string, icon: string }> = {
  komplett: { label: "Komplett", icon: "🍱" },
  gemuese: { label: "Gemüse", icon: "🥦" },
  fleisch: { label: "Fleisch", icon: "🥩" },
  staerke: { label: "Stärke", icon: "🥔" },
};

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onDelete, onEdit, onAddToPlanner, onClick, isDraggable }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onClick?.(recipe)}
      className={`bg-white p-3 shadow-md rounded-sm border border-gray-100 transform rotate-1 hover:rotate-0 transition-transform duration-300 flex flex-col gap-2 w-full max-w-[240px] ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="aspect-square w-full overflow-hidden bg-gray-100 rounded-sm relative group">
        {recipe.image ? (
          <img
            src={getImageUrl(recipe.image)}
            alt={recipe.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Kein Bild
          </div>
        )}

        <div className="absolute bottom-2 right-2 md:inset-0 md:bottom-0 md:right-0 bg-transparent md:bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex flex-row items-end md:items-center justify-end md:justify-center gap-1.5">
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-white/90 backdrop-blur-sm md:bg-white rounded-full text-gray-700 hover:text-indigo-600 shadow-sm md:shadow-none"
              title="Quelle ansehen"
            >
              <ExternalLink size={16} />
            </a>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
              className="p-1.5 bg-white/90 backdrop-blur-sm md:bg-white rounded-full text-indigo-600 hover:bg-indigo-50 shadow-sm md:shadow-none"
              title="Rezept bearbeiten"
            >
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
              className="p-1.5 bg-white/90 backdrop-blur-sm md:bg-white rounded-full text-red-500 hover:bg-red-50 shadow-sm md:shadow-none"
              title="Rezept löschen"
            >
              <Trash2 size={16} />
            </button>
          )}
          {onAddToPlanner && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToPlanner(recipe); }}
              className="p-1.5 bg-white/90 backdrop-blur-sm md:bg-white rounded-full text-green-500 hover:bg-green-50 shadow-sm md:shadow-none"
              title="Zum Planer hinzufügen"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-serif font-bold text-gray-800 leading-tight line-clamp-2">
          {recipe.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
          {recipe.prepTime && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {recipe.prepTime}
            </span>
          )}
          {recipe.mealTime && MEAL_TIME_LABELS[recipe.mealTime] && (
             <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold rounded shadow-sm border border-yellow-100/50">
               <span className="text-[12px]">{MEAL_TIME_LABELS[recipe.mealTime].icon}</span>
               {MEAL_TIME_LABELS[recipe.mealTime].label}
             </span>
          )}
           {recipe.category && CATEGORY_LABELS[recipe.category] && (
             <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded shadow-sm border border-emerald-100/50">
                 <span className="text-[12px]">{CATEGORY_LABELS[recipe.category].icon}</span>
                 {CATEGORY_LABELS[recipe.category].label}
             </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {(recipe.tags || []).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-semibold rounded uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export const MiniRecipeCard: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  return (
    <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-all shadow-sm">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
        {recipe.image ? (
          <img src={getImageUrl(recipe.image)} alt={recipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300">N/A</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-gray-700 truncate">{recipe.title}</h4>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock size={10} /> {recipe.prepTime || "N/A"}
        </div>
      </div>
    </div>
  );
};
