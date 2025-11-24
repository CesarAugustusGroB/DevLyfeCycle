import React, { useState, useEffect } from 'react';
import { 
  Github, 
  Plus, 
  Activity, 
  CheckCircle2, 
  Hammer, 
  ArrowUpRight, 
  Layout, 
  Trash2, 
  AlertCircle,
  Sparkles,
  Loader2,
  Copy,
  Target,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  X,
  Check
} from 'lucide-react';
import { Project, Feature, LifecycleState } from './types';
import { analyzeProjectRequirements, expandFeature, generateStatusReport } from './services/geminiService';
import { saveProjects, loadProjects } from './services/storage';
import { FeatureDetailModal } from './components/FeatureDetailModal';

// --- Helper Functions ---

const countStats = (features: Feature[]) => {
  let stats = { total: 0, stable: 0, creating: 0, polishing: 0 };
  features.forEach(f => {
    stats.total++;
    if (f.state === 'STABLE') stats.stable++;
    if (f.state === 'CREATING') stats.creating++;
    if (f.state === 'FIX/POLISH') stats.polishing++;
    
    if (f.subfeatures && f.subfeatures.length > 0) {
      const sub = countStats(f.subfeatures);
      stats.total += sub.total;
      stats.stable += sub.stable;
      stats.creating += sub.creating;
      stats.polishing += sub.polishing;
    }
  });
  return stats;
};

// --- Components ---

const StateBadge = ({ state, className = '' }: { state: LifecycleState, className?: string }) => {
  const styles = {
    'CREATING': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'FIX/POLISH': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'EXPANDING': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'STABLE': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const icons = {
    'CREATING': <Plus className="w-3 h-3 mr-1" />,
    'FIX/POLISH': <Hammer className="w-3 h-3 mr-1" />,
    'EXPANDING': <ArrowUpRight className="w-3 h-3 mr-1" />,
    'STABLE': <CheckCircle2 className="w-3 h-3 mr-1" />,
  };

  return (
    <span className={`flex items-center px-2 py-1 rounded-md text-xs font-medium border ${styles[state]} ${className}`}>
      {icons[state]}
      {state}
    </span>
  );
};

const ProjectCard = ({ project, onClick }: { project: Project; onClick: () => void }) => {
  const stats = countStats(project.features);
  
  // Calculate progress based on total nodes
  const percentage = stats.total > 0 ? Math.round((stats.stable / stats.total) * 100) : 0;

  return (
    <div 
      onClick={onClick}
      className="group bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-900/10 flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-slate-100 text-lg group-hover:text-blue-400 transition-colors">{project.title}</h3>
        {project.repoUrl && <Github className="w-5 h-5 text-slate-500 hover:text-white" />}
      </div>
      <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-grow">{project.description}</p>
      
      <div className="space-y-3 mt-auto">
        <div className="flex justify-between text-xs font-mono text-slate-500">
            <span>Progress</span>
            <span>{percentage}% Stable</span>
        </div>
        
        <div className="flex w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div style={{ width: `${(stats.creating / stats.total) * 100}%` }} className="bg-blue-500" />
          <div style={{ width: `${(stats.polishing / stats.total) * 100}%` }} className="bg-amber-500" />
          <div style={{ flex: 1 }} className="bg-emerald-500" />
        </div>
        
        <div className="flex gap-2 text-[10px] text-slate-400 uppercase tracking-wider">
          {stats.creating > 0 && <span className="text-blue-400">{stats.creating} New</span>}
          {stats.polishing > 0 && <span className="text-amber-400">{stats.polishing} Fix</span>}
          {stats.stable > 0 && <span className="text-emerald-400">{stats.stable} Done</span>}
        </div>
      </div>
    </div>
  );
};

interface FeatureRowProps {
  feature: Feature;
  depth?: number;
  onExpand: (id: string) => void;
  onUpdateState: (id: string, state: LifecycleState) => void;
  onDelete: (id: string) => void;
  onAiExpand: (feature: Feature) => void;
  onSelect: (id: string) => void;
  expandingId: string | null;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ 
  feature, 
  depth = 0, 
  onExpand, 
  onUpdateState, 
  onDelete, 
  onAiExpand, 
  onSelect,
  expandingId 
}) => {
  const hasChildren = feature.subfeatures && feature.subfeatures.length > 0;
  
  return (
    <>
      <div 
        className="grid grid-cols-12 items-center py-3 px-4 hover:bg-slate-800/50 transition-colors group border-b border-slate-800/50 last:border-0"
        style={{ paddingLeft: `${Math.max(1, depth * 1.5 + 1)}rem` }}
      >
        <div className="col-span-6 flex items-center gap-2 pr-4 overflow-hidden">
          {depth > 0 && <CornerDownRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
          
          <button 
            onClick={(e) => { e.stopPropagation(); onExpand(feature.id); }}
            className={`p-1 rounded hover:bg-slate-700 text-slate-400 transition-colors ${!hasChildren && depth === 0 ? 'invisible' : ''} ${hasChildren ? '' : 'opacity-0'}`}
            disabled={!hasChildren}
          >
             {feature.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          <div 
            className="flex-1 cursor-pointer overflow-hidden" 
            onClick={() => onSelect(feature.id)}
          >
            <p className={`font-medium text-slate-200 group-hover:text-blue-400 transition-colors truncate ${depth > 0 ? 'text-sm' : ''}`}>
              {feature.name}
            </p>
            {feature.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{feature.notes}</p>}
          </div>
        </div>

        <div className="col-span-3 flex items-center">
           <StateBadge state={feature.state} className="scale-90 origin-left" />
        </div>

        <div className="col-span-3 flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            {/* AI Expand Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onAiExpand(feature); }}
                disabled={expandingId === feature.id}
                className={`p-1.5 mr-1 rounded transition-colors ${
                    expandingId === feature.id 
                    ? 'bg-indigo-500/20 text-indigo-400' 
                    : 'text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-400'
                }`}
                title="Use AI to break down this feature"
            >
                {expandingId === feature.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5" />}
            </button>

            {/* State Controls */}
            <select 
                value={feature.state}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdateState(feature.id, e.target.value as LifecycleState)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none mr-2 max-w-[80px]"
            >
                <option value="CREATING">Create</option>
                <option value="FIX/POLISH">Fix</option>
                <option value="EXPANDING">Expand</option>
                <option value="STABLE">Stable</option>
            </select>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(feature.id); }}
                className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-slate-500 rounded transition-colors"
                title="Delete Feature"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>
      
      {/* Recursive Render */}
      {feature.isExpanded && feature.subfeatures && feature.subfeatures.map(sub => (
        <FeatureRow
          key={sub.id}
          feature={sub}
          depth={depth + 1}
          onExpand={onExpand}
          onUpdateState={onUpdateState}
          onDelete={onDelete}
          onAiExpand={onAiExpand}
          onSelect={onSelect}
          expandingId={expandingId}
        />
      ))}
    </>
  );
};

// --- Main Application ---

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newRepo, setNewRepo] = useState('');
  const [designDoc, setDesignDoc] = useState('');
  
  // New Feature Input State
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  
  // AI Loading States
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [expandingFeatureId, setExpandingFeatureId] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  // Detail View State
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === selectedId);

  // Recursive finder
  const findFeatureRecursive = (features: Feature[], targetId: string): Feature | undefined => {
    for (const f of features) {
      if (f.id === targetId) return f;
      if (f.subfeatures) {
        const found = findFeatureRecursive(f.subfeatures, targetId);
        if (found) return found;
      }
    }
    return undefined;
  };

  const activeFeature = activeProject && selectedFeatureId 
    ? findFeatureRecursive(activeProject.features, selectedFeatureId) 
    : undefined;

  // --- Persistence Logic ---

  useEffect(() => {
    const loaded = loadProjects();
    const migrated = loaded.map(p => ({
        ...p,
        goal: p.goal || "No specific goal defined.",
        features: p.features.map(migrateFeature)
    })) as Project[];
    setProjects(migrated);
  }, []);

  const migrateFeature = (f: any): Feature => ({
    ...f,
    state: (f.state as string) === 'FIX_POLISH' ? 'FIX/POLISH' : f.state,
    subfeatures: Array.isArray(f.subfeatures) ? f.subfeatures.map(migrateFeature) : [],
    isExpanded: f.isExpanded ?? false,
    contextFiles: Array.isArray(f.contextFiles) ? f.contextFiles : []
  });

  useEffect(() => {
    if (projects.length > 0) {
      saveProjects(projects);
    }
  }, [projects]);

  // --- Deep Update Logic ---

  const updateFeatureDeep = (features: Feature[], targetId: string, updater: (f: Feature) => Feature): Feature[] => {
    return features.map(f => {
      if (f.id === targetId) {
        return updater(f);
      }
      if (f.subfeatures && f.subfeatures.length > 0) {
        return { ...f, subfeatures: updateFeatureDeep(f.subfeatures, targetId, updater) };
      }
      return f;
    });
  };

  const deleteFeatureDeep = (features: Feature[], targetId: string): Feature[] => {
    return features
      .filter(f => f.id !== targetId)
      .map(f => ({
        ...f,
        subfeatures: f.subfeatures ? deleteFeatureDeep(f.subfeatures, targetId) : []
      }));
  };

  // --- Handlers ---

  const handleParseAndCreate = async () => {
    setIsAiLoading(true);
    try {
      const data = await analyzeProjectRequirements(designDoc, newTitle);

      const features: Feature[] = (data.features || []).map((f: any, idx: number) => ({
        id: `new-${Date.now()}-${idx}`,
        name: f.name || "Untitled Feature",
        state: 'CREATING',
        notes: f.notes || "AI Generated",
        subfeatures: [],
        isExpanded: false,
        contextFiles: []
      }));

      const newProject: Project = {
        id: Date.now().toString(),
        title: newTitle || data.title || 'Untitled Project',
        repoUrl: newRepo,
        description: data.description || 'No description generated.',
        goal: data.goal || 'Complete all features.',
        features,
        lastUpdated: new Date().toISOString()
      };

      setProjects(prev => [...prev, newProject]);
      setIsCreating(false);
      setSelectedId(newProject.id);
      setNewTitle('');
      setNewRepo('');
      setDesignDoc('');

    } catch (e) {
      console.error(e);
      alert("AI Parsing failed. Please try again or fill manually.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleManualCreate = () => {
    const titleToUse = newTitle.trim() || "Untitled Project";
    const descToUse = designDoc.trim() || "Manually created project.";
    
    const newProject: Project = {
      id: Date.now().toString(),
      title: titleToUse,
      repoUrl: newRepo,
      description: descToUse,
      goal: 'No specific goal defined.',
      features: [],
      lastUpdated: new Date().toISOString()
    };

    setProjects(prev => [...prev, newProject]);
    setIsCreating(false);
    setSelectedId(newProject.id);
    setNewTitle('');
    setNewRepo('');
    setDesignDoc('');
  };

  const handleAiExpandFeature = async (feature: Feature) => {
    if (!activeProject) return;
    setExpandingFeatureId(feature.id);
    try {
      const projectDesc = activeProject.description || "";
      const data = await expandFeature(feature, projectDesc);

      const newSubFeatures: Feature[] = (data.subtasks || []).map((t: any, idx: number) => ({
        id: `sub-${Date.now()}-${idx}`,
        name: t.name,
        state: 'CREATING', 
        notes: t.notes,
        subfeatures: [],
        isExpanded: false,
        contextFiles: []
      }));

      // Add subfeatures to the specific feature and expand it
      setProjects(prev => prev.map(p => {
        if (p.id !== activeProject.id) return p;
        return {
          ...p,
          features: updateFeatureDeep(p.features, feature.id, (f) => ({
            ...f,
            isExpanded: true,
            subfeatures: [...f.subfeatures, ...newSubFeatures]
          }))
        };
      }));

    } catch (e) {
      console.error(e);
      alert("Failed to expand feature.");
    } finally {
      setExpandingFeatureId(null);
    }
  };

  const handleGenerateReport = async (project: Project) => {
    setIsAiLoading(true);
    setGeneratedReport(null);
    try {
      const text = await generateStatusReport(project);
      setGeneratedReport(text);
    } catch (e) {
      alert("Failed to generate report");
    } finally {
      setIsAiLoading(false);
    }
  };

  const updateFeatureState = (projectId: string, featureId: string, newState: LifecycleState) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        features: updateFeatureDeep(p.features, featureId, (f) => ({ ...f, state: newState }))
      };
    }));
  };

  const updateFeatureDetails = (projectId: string, featureId: string, updates: Partial<Feature>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        features: updateFeatureDeep(p.features, featureId, (f) => ({ ...f, ...updates }))
      };
    }));
  };

  const toggleFeatureExpand = (projectId: string, featureId: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
            ...p,
            features: updateFeatureDeep(p.features, featureId, (f) => ({ ...f, isExpanded: !f.isExpanded }))
        };
    }));
  };

  const deleteFeature = (projectId: string, featureId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        features: deleteFeatureDeep(p.features, featureId)
      };
    }));
  };

  const startAddingFeature = () => {
    setIsAddingFeature(true);
    setTimeout(() => document.getElementById('new-feature-input')?.focus(), 100);
  };

  const saveNewFeature = (projectId: string) => {
    if (!newFeatureName.trim()) {
      setIsAddingFeature(false);
      return;
    }
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        features: [...p.features, { 
            id: Date.now().toString(), 
            name: newFeatureName, 
            state: 'CREATING', 
            notes: '', 
            subfeatures: [], 
            isExpanded: false,
            contextFiles: []
        }]
      };
    }));
    setNewFeatureName('');
    setIsAddingFeature(false);
  };

  const cancelAddingFeature = () => {
    setIsAddingFeature(false);
    setNewFeatureName('');
  };

  const deleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to delete this project?')) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (selectedId === projectId) setSelectedId(null);
    }
  }

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              DevLifecycle
            </h1>
          </div>
          <button 
            onClick={() => { setIsCreating(true); setSelectedId(null); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Creation Modal / View */}
        {isCreating ? (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-6 text-blue-400">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">AI Project Ingestion (Thinking Mode)</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Project Name (Optional)</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                    placeholder="e.g. Super App" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">GitHub URL</label>
                  <div className="relative">
                    <Github className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      value={newRepo}
                      onChange={(e) => setNewRepo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500" 
                      placeholder="https://github.com/..." 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                  Paste Design Document / Brain Dump
                </label>
                <div className="text-xs text-slate-400 mb-2 bg-slate-800/50 p-3 rounded border border-slate-700">
                  <span className="font-bold text-blue-400">Gemini Power:</span> Paste rough notes, emails, or Jira tickets. We'll extract the goal and features using deep reasoning.
                </div>
                <textarea 
                  value={designDoc}
                  onChange={(e) => setDesignDoc(e.target.value)}
                  className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-300 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder={`I want to build a Spotify clone. \nIt needs a music player, playlist management, and user profiles.\nAlso maybe social sharing.`}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-800">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleManualCreate}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 font-medium"
                >
                  Create Manually
                </button>

                <button 
                  onClick={handleParseAndCreate}
                  disabled={isAiLoading || !designDoc}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-all shadow-lg shadow-blue-900/20"
                >
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isAiLoading ? 'Thinking...' : 'Analyze & Create with Gemini'}
                </button>
              </div>
            </div>
          </div>
        ) : selectedId && activeProject ? (
          // Detail View
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button 
              onClick={() => setSelectedId(null)}
              className="mb-6 text-sm text-slate-400 hover:text-white flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Meta */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl shadow-slate-950/50">
                  <h2 className="text-2xl font-bold mb-2">{activeProject.title}</h2>
                  <p className="text-slate-400 text-sm mb-6">{activeProject.description}</p>
                  
                  {activeProject.repoUrl ? (
                     <a 
                     href={activeProject.repoUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-2 rounded-lg transition-colors"
                   >
                     <Github className="w-4 h-4" />
                     Open Repository
                   </a>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                      <AlertCircle className="w-4 h-4" />
                      No Repository Linked
                    </div>
                  )}

                  {/* GAP ANALYSIS SECTION */}
                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-semibold uppercase text-slate-500">Project Scope / Goal</h3>
                    </div>
                    <div className="bg-blue-500/5 p-3 rounded border border-blue-500/10 text-sm text-slate-300 italic">
                        "{activeProject.goal || 'No explicit goal set.'}"
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <h3 className="text-xs font-semibold uppercase text-slate-500 mb-4">Implementation Status</h3>
                    <div className="space-y-3">
                        {(() => {
                            const stats = countStats(activeProject.features);
                            return (
                                <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Total Tasks</span>
                                    <span className="font-mono">{stats.total}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-400">Implemented (Stable)</span>
                                    <span className="font-mono">{stats.stable}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-400">In Progress</span>
                                    <span className="font-mono text-blue-400">
                                    {stats.creating + stats.polishing}
                                    </span>
                                </div>
                                </>
                            )
                        })()}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-800">
                     <button
                        onClick={() => handleGenerateReport(activeProject)}
                        disabled={isAiLoading}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 py-2 rounded-lg transition-colors text-sm"
                     >
                        {isAiLoading && !generatedReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate Status Report
                     </button>
                     {generatedReport && (
                        <div className="mt-4 bg-slate-950 p-4 rounded-lg border border-slate-800 relative group animate-in fade-in zoom-in-95 duration-200">
                             <h4 className="text-xs text-slate-500 uppercase font-bold mb-2">AI Report</h4>
                             <p className="text-xs text-slate-300 whitespace-pre-wrap">{generatedReport}</p>
                             <button 
                                onClick={() => navigator.clipboard.writeText(generatedReport)}
                                className="absolute top-2 right-2 p-1.5 bg-slate-800 text-slate-400 rounded hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy to clipboard"
                             >
                                <Copy className="w-3 h-3" />
                             </button>
                        </div>
                     )}
                  </div>
                </div>
              </div>

              {/* Right Column: Features/Board */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Layout className="w-5 h-5 text-blue-500" />
                    Feature Implementation
                  </h3>
                  <button 
                    onClick={startAddingFeature}
                    className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
                  >
                    + Add Feature
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-slate-950/50">
                  <div className="grid grid-cols-12 bg-slate-950/50 border-b border-slate-800 py-3 px-4 text-xs font-semibold text-slate-500 uppercase">
                    <div className="col-span-6">Feature Name</div>
                    <div className="col-span-3">State</div>
                    <div className="col-span-3 text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-slate-800/50">
                    {/* Add Feature Input Row */}
                    {isAddingFeature && (
                       <div className="grid grid-cols-12 items-center py-3 px-4 bg-slate-800/80 animate-in fade-in slide-in-from-top-2">
                         <div className="col-span-12 flex gap-2">
                            <input
                              id="new-feature-input"
                              type="text"
                              value={newFeatureName}
                              onChange={(e) => setNewFeatureName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveNewFeature(activeProject.id);
                                if (e.key === 'Escape') cancelAddingFeature();
                              }}
                              className="flex-1 bg-slate-950 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                              placeholder="Feature name..."
                            />
                            <button 
                                onClick={() => saveNewFeature(activeProject.id)}
                                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={cancelAddingFeature}
                                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                         </div>
                       </div>
                    )}

                    {activeProject.features.length === 0 && !isAddingFeature && (
                        <div className="p-8 text-center text-slate-500 italic">
                            No features tracked yet. Add one or parse a document.
                        </div>
                    )}
                    {activeProject.features.map(feature => (
                      <FeatureRow
                        key={feature.id}
                        feature={feature}
                        onExpand={(id) => toggleFeatureExpand(activeProject.id, id)}
                        onUpdateState={(id, s) => updateFeatureState(activeProject.id, id, s)}
                        onDelete={(id) => deleteFeature(activeProject.id, id)}
                        onAiExpand={handleAiExpandFeature}
                        onSelect={(id) => setSelectedFeatureId(id)}
                        expandingId={expandingFeatureId}
                      />
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Feature Detail Modal */}
            {activeFeature && (
                <FeatureDetailModal
                    isOpen={!!selectedFeatureId}
                    onClose={() => setSelectedFeatureId(null)}
                    feature={activeFeature}
                    onSave={(id, updates) => updateFeatureDetails(activeProject.id, id, updates)}
                    onDelete={(id) => deleteFeature(activeProject.id, id)}
                    onAiExpand={handleAiExpandFeature}
                    isAiExpanding={expandingFeatureId === activeFeature.id}
                />
            )}
          </div>
        ) : (
          // Dashboard Grid
          <div>
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-lg font-semibold text-slate-400">Active Projects</h2>
               <div className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                 {projects.length} Total
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div key={project.id} className="relative group/card">
                    <ProjectCard 
                        project={project} 
                        onClick={() => setSelectedId(project.id)} 
                    />
                    <button 
                        onClick={(e) => deleteProject(project.id, e)}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-slate-500 hover:text-red-400 rounded opacity-0 group-hover/card:opacity-100 transition-opacity"
                        title="Delete Project"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
              ))}
              
              {/* Empty State / Add New Card */}
              <button 
                onClick={() => { setIsCreating(true); setSelectedId(null); }}
                className="group flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-slate-800 hover:border-blue-500/30 rounded-xl hover:bg-slate-900/50 transition-all gap-4"
              >
                <div className="bg-slate-800 group-hover:bg-blue-600/20 p-4 rounded-full transition-colors">
                  <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
                </div>
                <span className="font-medium text-slate-400 group-hover:text-slate-200">Initialize New Project</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}