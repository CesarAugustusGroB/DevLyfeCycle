import React, { useState } from 'react';
import { analyzeProjectRequirements } from '../services/geminiService';
import { ProjectAnalysisResponse } from '../types';
import { X, BrainCircuit, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: ProjectAnalysisResponse) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Pass empty string for title preference as it's not used in this modal
      const result = await analyzeProjectRequirements(input, '');
      onCreate(result);
      setInput('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">New AI Project</h2>
              <p className="text-sm text-gray-400">Paste your raw notes, ideas, or specs.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 flex flex-col gap-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. I want to build a calorie tracker app. It needs a database for food items, a user login system using Auth0, a dashboard chart showing daily intake, and a profile settings page..."
            className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder-gray-600 font-mono text-sm leading-relaxed"
          />
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !input.trim()}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all shadow-lg shadow-indigo-500/20
              ${isLoading || !input.trim() 
                ? 'bg-gray-700 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5'
              }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <BrainCircuit className="w-5 h-5" />
                Architect Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};