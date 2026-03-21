import React from "react";
import { Recipe, Ingredient } from "../types";
import { X, Clock, ChefHat, Tag, ShoppingBag, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { getImageUrl } from "../utils/imageUrl";
import { MEAL_TIME_LABELS, CATEGORY_LABELS } from "./RecipeCard";

interface RecipeDetailsModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export const RecipeDetailsModal: React.FC<RecipeDetailsModalProps> = ({ recipe, onClose }) => {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12 h-[100dvh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-full bg-[#FAFAFA] rounded-2xl md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header Image Area */}
          <div className="relative h-48 md:h-64 shrink-0 bg-gray-100">
            {recipe.image ? (
              <img
                src={getImageUrl(recipe.image)}
                alt={recipe.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
             <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
               <ChefHat size={64} />
             </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="absolute bottom-4 left-6 right-6">
              <div className="flex flex-wrap gap-2 mb-3">
                 {recipe.mealTime && MEAL_TIME_LABELS[recipe.mealTime] && (
                   <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/20 shadow-sm">
                     <span>{MEAL_TIME_LABELS[recipe.mealTime].icon}</span>
                     {MEAL_TIME_LABELS[recipe.mealTime].label}
                   </span>
                )}
                 {recipe.category && CATEGORY_LABELS[recipe.category] && (
                   <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/20 shadow-sm">
                       <span>{CATEGORY_LABELS[recipe.category].icon}</span>
                       {CATEGORY_LABELS[recipe.category].label}
                   </span>
                )}
              </div>
              <h2 className="text-2xl md:text-4xl font-serif font-black text-white leading-tight drop-shadow-md">
                {recipe.title}
              </h2>
            </div>
          </div>

          {/* Details Bar */}
          <div className="flex items-center gap-6 px-6 py-4 bg-white border-b border-gray-100 overflow-x-auto no-scrollbar shrink-0">
            {recipe.prepTime && (
              <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                    <Clock size={16} />
                </div>
                <span>{recipe.prepTime}</span>
              </div>
            )}
            
            <div className="h-4 w-px bg-gray-200 shrink-0" />
            
            <div className="flex items-center gap-2 text-gray-600 font-medium whitespace-nowrap">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <ShoppingBag size={16} />
                </div>
                <span>{recipe.ingredients.length} Zutaten</span>
            </div>

            {recipe.sourceUrl && (
                <>
                 <div className="h-4 w-px bg-gray-200 shrink-0" />
                 <a 
                    href={recipe.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 whitespace-nowrap transition-colors"
                 >
                    <ExternalLink size={16} />
                    <span>Quelle öffnen</span>
                 </a>
                </>
            )}
          </div>

          {/* Scrolling Content Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8 md:gap-12">
            
            {/* Left Column: Ingredients */}
            <div className="w-full md:w-1/3 flex flex-col gap-6 shrink-0">
                <div>
                   <h3 className="text-xl font-serif font-bold text-gray-900 mb-4 flex items-center gap-2">
                     Zutaten
                   </h3>
                   <div className="flex flex-col border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                     {recipe.ingredients.map((ing, i) => (
                       <div key={i} className={`flex justify-between items-center p-3 sm:px-4 ${i !== recipe.ingredients.length - 1 ? 'border-b border-gray-50' : ''} ${ing.isPantry ? 'bg-gray-50/50' : ''}`}>
                         <span className={`text-sm font-semibold ${ing.isPantry ? 'text-gray-500' : 'text-gray-800'}`}>
                            {ing.name}
                         </span>
                         <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">
                            {ing.amount}
                         </span>
                       </div>
                     ))}
                   </div>
                </div>

                {recipe.tags && recipe.tags.length > 0 && (
                   <div>
                       <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Tags</h3>
                       <div className="flex flex-wrap gap-2">
                           {recipe.tags.map(tag => (
                               <span key={tag} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-lg flex items-center gap-1 border border-indigo-100/50">
                                   <Tag size={12} /> {tag}
                               </span>
                           ))}
                       </div>
                   </div>
                )}
            </div>

            {/* Right Column: Instructions */}
            <div className="w-full md:w-2/3 flex flex-col">
                 <h3 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
                     Zubereitung
                 </h3>
                 
                 <div className="prose prose-indigo prose-sm sm:prose-base prose-headings:font-serif prose-headings:text-gray-800 prose-p:text-gray-600 prose-li:text-gray-600 max-w-none bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
                    <ReactMarkdown>{recipe.instructions}</ReactMarkdown>
                 </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
