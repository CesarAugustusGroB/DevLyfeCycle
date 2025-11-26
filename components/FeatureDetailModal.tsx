import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Activity, Sparkles, Loader2, ListTree, Plus, Circle, Check, FileText, Upload } from 'lucide-react';
import { Feature, LifecycleState, ContextFile } from '../types';
import { StatusBadge } from './StatusBadge';

interface FeatureDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: Feature;
  onSave: (id: string, updates: Partial<Feature>) => void;
  onDelete: (id: string) => void;
}

export const FeatureDetailModal: React.FC<FeatureDetailModalProps> = ({
  isOpen,
  onClose,
  feature,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(feature.name);
  const [notes, setNotes] = useState(feature.notes);
  const [state, setState] = useState<LifecycleState>(feature.state);
  const [subfeatures, setSubfeatures] = useState<Feature[]>(feature.subfeatures || []);
  const [contextFiles, setContextFiles] = useState<ContextFile[]>(feature.contextFiles || []);
  const [isDirty, setIsDirty] = useState(false);

  // Subtask adding state
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(feature.name);
    setNotes(feature.notes);
    setState(feature.state);
    setSubfeatures(feature.subfeatures || []);
    setContextFiles(feature.contextFiles || []);
    setIsDirty(false);
    setIsAddingSubtask(false);
    setNewSubtaskName('');
  }, [feature, isOpen]);

  const handleSave = () => {
    onSave(feature.id, { name, notes, state, subfeatures, contextFiles });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this feature?')) {
      onDelete(feature.id);
      onClose();
    }
  };

  const startAddingSubtask = () => {
    setIsAddingSubtask(true);
    setTimeout(() => document.getElementById('new-subtask-input')?.focus(), 50);
  };

  const saveNewSubtask = () => {
    if (!newSubtaskName.trim()) {
      setIsAddingSubtask(false);
      return;
    }
    const newSub: Feature = {
      id: `sub-manual-${Date.now()}`,
      name: newSubtaskName,
      state: 'CREATING',
      notes: '',
      subfeatures: [],
      isExpanded: false,
      contextFiles: []
    };
    setSubfeatures([...subfeatures, newSub]);
    setIsDirty(true);
    setNewSubtaskName('');
    setIsAddingSubtask(false);
  };

  const deleteSubtask = (id: string) => {
    setSubfeatures(subfeatures.filter(s => s.id !== id));
    setIsDirty(true);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const newFile: ContextFile = {
        id: Date.now().toString(),
        name: file.name,
        content: text,
        type: file.type
      };
      setContextFiles(prev => [...prev, newFile]);
      setIsDirty(true);
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteContextFile = (id: string) => {
    setContextFiles(prev => prev.filter(f => f.id !== id));
    setIsDirty(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-800 bg-slate-900">
          <div className="flex-1 mr-4">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Feature Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
              className="w-full bg-transparent text-xl font-bold text-slate-100 focus:outline-none border-b border-transparent focus:border-blue-500 transition-colors pb-1"
            />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

          {/* State Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-3">Current State</label>
            <div className="flex flex-wrap gap-2">
              {(['CREATING', 'FIX/POLISH', 'EXPANDING', 'STABLE'] as LifecycleState[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setState(s); setIsDirty(true); }}
                  className={`relative group transition-all duration-200 ${state === s ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100'}`}
                >
                  <StatusBadge state={s} className="px-3 py-1.5 text-sm cursor-pointer" />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Implementation Notes</label>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm leading-relaxed"
              placeholder="Add technical details, acceptance criteria, or bugs here..."
            />
          </div>

          {/* Context Files Section */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex justify-between items-center mb-3">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <FileText className="w-3 h-3" />
                Context & Code ({contextFiles.length})
              </label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept=".txt,.md,.json,.js,.ts,.tsx,.css,.html,.py,.java,.c,.cpp"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-blue-400 flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3 h-3" /> Attach File
              </button>
            </div>

            {contextFiles.length > 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <ul className="divide-y divide-slate-800/50">
                  {contextFiles.map(file => (
                    <li key={file.id} className="p-3 flex items-center justify-between group hover:bg-slate-900 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-1.5 bg-slate-800 rounded">
                          <FileText className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-slate-300 truncate font-medium">{file.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{file.type || 'text/plain'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteContextFile(file.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-xs text-slate-600 italic p-2 border border-dashed border-slate-800 rounded text-center">
                No files attached. Upload code to give Gemini context.
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex justify-between items-center mb-3">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <ListTree className="w-3 h-3" />
                Subtasks ({subfeatures.length})
              </label>
              <button
                onClick={startAddingSubtask}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-blue-400 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
              <ul className="divide-y divide-slate-800/50">
                {/* Add Subtask Input */}
                {isAddingSubtask && (
                  <li className="p-2 bg-slate-800/50">
                    <div className="flex gap-2">
                      <input
                        id="new-subtask-input"
                        type="text"
                        value={newSubtaskName}
                        onChange={(e) => setNewSubtaskName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveNewSubtask();
                          if (e.key === 'Escape') setIsAddingSubtask(false);
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="Subtask name..."
                      />
                      <button onClick={saveNewSubtask} className="p-1 text-blue-400 hover:text-white"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setIsAddingSubtask(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  </li>
                )}

                {subfeatures.length === 0 && !isAddingSubtask ? (
                  <div className="p-4 text-center text-xs text-slate-600 italic">No subtasks defined.</div>
                ) : (
                  subfeatures.map(sub => (
                    <li key={sub.id} className="p-3 flex items-center justify-between group hover:bg-slate-900 transition-colors">
                      <div className="flex items-center gap-2">
                        <Circle className="w-2 h-2 text-slate-600 fill-slate-800" />
                        <span className="text-sm text-slate-300">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge state={sub.state} className="scale-75 origin-right" />
                        <button onClick={() => deleteSubtask(sub.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* AI Action */}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-lg
                    ${!isDirty
                  ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }`}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
