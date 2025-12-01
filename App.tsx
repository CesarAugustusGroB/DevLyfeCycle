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
  Check,
  Clock,
  GripVertical,
  Download,
  Upload
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project, Feature, LifecycleState } from './types';
import { saveProjects, loadProjects } from './services/storage';
import { FeatureDetailModal } from './components/FeatureDetailModal';

// --- Helper Functions ---

const countStats = (features: Feature[]) => {
  let stats = { total: 0, stable: 0, creating: 0, polishing: 0, backlog: 0 };
  features.forEach(f => {
    stats.total++;
    if (f.state === 'STABLE') stats.stable++;
    if (f.state === 'CREATING') stats.creating++;
    if (f.state === 'FIX/POLISH') stats.polishing++;
    if (f.state === 'BACKLOG') stats.backlog++;

    if (f.subfeatures && f.subfeatures.length > 0) {
      const sub = countStats(f.subfeatures);
      stats.total += sub.total;
      stats.stable += sub.stable;
      stats.creating += sub.creating;
      stats.polishing += sub.polishing;
      stats.backlog += sub.backlog;
    }
  });
  return stats;
};

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

const migrateFeature = (f: any): Feature => ({
  ...f,
  contextFiles: f.contextFiles || [],
  subfeatures: f.subfeatures ? f.subfeatures.map(migrateFeature) : []
});

const migrateProject = (p: any): Project => ({
  ...p,
  scope: p.scope || "No specific scope defined.",
  goal: p.goal || "No specific goal defined.",
  features: p.features.map(migrateFeature)
});

// --- Components ---

const StateBadge = ({ state, className = '' }: { state: LifecycleState, className?: string }) => {
  const styles = {
    'BACKLOG': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'CREATING': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'FIX/POLISH': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'EXPANDING': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'STABLE': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const icons = {
    'BACKLOG': <Clock className="w-3 h-3 mr-1" />,
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
      className="group bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col h-full hover:-translate-y-1"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{project.title}</h3>
        {project.repoUrl && <Github className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />}
      </div>

      <p className="text-slate-400 text-sm mb-6 line-clamp-2 flex-grow leading-relaxed">{project.description}</p>

      {project.scope && project.scope !== "No specific scope defined." && (
        <div className="mb-4">
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-800/50 border border-white/5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            <Target className="w-3 h-3 mr-1.5 text-blue-500" />
            {project.scope}
          </span>
        </div>
      )}

      <div className="space-y-4 mt-auto">
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>Progress</span>
          <span className="text-slate-300">{percentage}%</span>
        </div>

        <div className="flex w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
          <div style={{ width: `${(stats.creating / stats.total) * 100}%` }} className="bg-blue-500/80" />
          <div style={{ width: `${(stats.polishing / stats.total) * 100}%` }} className="bg-amber-500/80" />
          <div style={{ width: `${(stats.backlog / stats.total) * 100}%` }} className="bg-slate-600/50" />
          <div style={{ flex: 1 }} className="bg-emerald-500/80" />
        </div>

        <div className="flex gap-3 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          {stats.creating > 0 && <span className="text-blue-400">{stats.creating} New</span>}
          {stats.polishing > 0 && <span className="text-amber-400">{stats.polishing} Fix</span>}
          {stats.backlog > 0 && <span className="text-slate-500">{stats.backlog} Backlog</span>}
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
  onSelect: (id: string) => void;
}

interface SortableFeatureRowProps extends FeatureRowProps {
  id: string;
}

const SortableFeatureRow: React.FC<SortableFeatureRowProps> = ({ id, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <FeatureRow {...props} dragHandleProps={listeners} />
    </div>
  );
};

const FeatureRow: React.FC<FeatureRowProps & { dragHandleProps?: any }> = ({
  feature,
  depth = 0,
  onExpand,
  onUpdateState,
  onDelete,
  onSelect,
  dragHandleProps
}) => {
  const hasChildren = feature.subfeatures && feature.subfeatures.length > 0;

  return (
    <>
      <div
        className="grid grid-cols-12 items-center py-3 px-4 hover:bg-slate-800/30 transition-all duration-200 group border-b border-white/5 last:border-0"
        style={{ paddingLeft: `${Math.max(1, depth * 1.5 + 1)}rem` }}
      >
        <div className="col-span-6 flex items-center gap-3 pr-4 overflow-hidden">
          {/* Drag Handle */}
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 p-1 -ml-2">
            <GripVertical className="w-4 h-4" />
          </div>

          {depth > 0 && <CornerDownRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}

          <button
            onClick={(e) => { e.stopPropagation(); onExpand(feature.id); }}
            className={`p-1 rounded hover:bg-slate-700/50 text-slate-400 transition-colors ${!hasChildren && depth === 0 ? 'invisible' : ''} ${hasChildren ? '' : 'opacity-0'}`}
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
            {feature.notes && <p className="text-xs text-slate-500 mt-0.5 truncate group-hover:text-slate-400 transition-colors">{feature.notes}</p>}
          </div>
        </div>

        <div className="col-span-3 flex items-center">
          <StateBadge state={feature.state} className="scale-90 origin-left shadow-sm" />
        </div>

        <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
          {/* State Controls */}
          <select
            value={feature.state}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdateState(feature.id, e.target.value as LifecycleState)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="BACKLOG">Backlog</option>
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

      {/* Recursive Render - Note: Subfeatures are not sortable yet in this implementation */}
      {feature.isExpanded && feature.subfeatures && feature.subfeatures.map(sub => (
        <FeatureRow
          key={sub.id}
          feature={sub}
          depth={depth + 1}
          onExpand={onExpand}
          onUpdateState={onUpdateState}
          onDelete={onDelete}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};

// --- Main Application ---

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newRepo, setNewRepo] = useState('');
  const [newScope, setNewScope] = useState('');
  const [designDoc, setDesignDoc] = useState('');

  // New Feature Input State
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');

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
    const migrated = loaded.map(migrateProject);
    setProjects(migrated);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveProjects(projects);
    }
  }, [projects, isLoaded]);

  // --- Handlers ---

  const handleManualCreate = () => {
    const titleToUse = newTitle.trim() || "Untitled Project";
    const descToUse = designDoc.trim() || "Manually created project.";
    const scopeToUse = newScope.trim() || "No specific scope defined.";

    const newProject: Project = {
      id: Date.now().toString(),
      title: titleToUse,
      repoUrl: newRepo,
      description: descToUse,
      scope: scopeToUse,
      goal: 'No specific goal defined.',
      features: [],
      lastUpdated: new Date().toISOString()
    };

    setProjects(prev => [...prev, newProject]);
    setIsCreating(false);
    setSelectedId(newProject.id);
    setNewTitle('');
    setNewRepo('');
    setNewScope('');
    setDesignDoc('');
  };

  const updateProjectDescription = (projectId: string, newDescription: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, description: newDescription };
    }));
  };

  const updateProjectGoal = (projectId: string, newGoal: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, goal: newGoal };
    }));
  };

  const updateProjectScope = (projectId: string, newScope: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, scope: newScope };
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
    if (window.confirm('Are you sure you want to delete this project?')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedId === projectId) setSelectedId(null);
    }
  }

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "devlifecycle-data.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedProjects = JSON.parse(content);
        if (Array.isArray(parsedProjects)) {
          // Basic validation could be added here
          setProjects(parsedProjects);
          saveProjects(parsedProjects); // Save immediately to persistence
          alert('Projects imported successfully!');
        } else {
          alert('Invalid file format: Expected an array of projects.');
        }
      } catch (error) {
        console.error('Error importing file:', error);
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    event.target.value = '';
  };

  // --- Render ---

  // Stats for active project
  const stats = activeProject ? countStats(activeProject.features) : { total: 0, stable: 0, creating: 0, polishing: 0, backlog: 0 };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && activeProject) {
      setProjects((prev) => {
        const projectIndex = prev.findIndex((p) => p.id === activeProject.id);
        if (projectIndex === -1) return prev;

        const oldIndex = activeProject.features.findIndex((f) => f.id === active.id);
        const newIndex = activeProject.features.findIndex((f) => f.id === over?.id);

        if (oldIndex === -1 || newIndex === -1) return prev;

        const newFeatures = arrayMove(activeProject.features, oldIndex, newIndex);

        const newProjects = [...prev];
        newProjects[projectIndex] = {
          ...activeProject,
          features: newFeatures,
        };
        return newProjects;
      });
    }
  };

  const updateFeatureState = (projectId: string, featureId: string, newState: LifecycleState) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      let newFeatures = updateFeatureDeep(p.features, featureId, (f) => ({ ...f, state: newState }));

      // If moving TO backlog, move to bottom of list (only for top-level features for now to keep it simple)
      if (newState === 'BACKLOG') {
        const featureIndex = newFeatures.findIndex(f => f.id === featureId);
        if (featureIndex !== -1) {
          const [feature] = newFeatures.splice(featureIndex, 1);
          newFeatures.push(feature);
        }
      }

      return {
        ...p,
        features: newFeatures
      };
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-blue-500 p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white">
              Dev<span className="text-blue-500">Lyfe</span>Cycle
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 border border-white/5 rounded-md transition-colors"
                title="Export Data to JSON"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 border border-white/5 rounded-md transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {isCreating ? (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setIsCreating(false)}
              className="mb-6 text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white">Initialize New Project</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Project Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                    placeholder="e.g. E-Commerce Dashboard"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Repository URL (Optional)</label>
                  <input
                    type="text"
                    value={newRepo}
                    onChange={e => setNewRepo(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                    placeholder="https://github.com/username/repo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Scope</label>
                  <input
                    type="text"
                    value={newScope}
                    onChange={e => setNewScope(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                    placeholder="e.g. MVP, Phase 1, Full Release"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Design Document / Requirements
                  </label>
                  <textarea
                    value={designDoc}
                    onChange={e => setDesignDoc(e.target.value)}
                    className="w-full h-48 bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all resize-none placeholder:text-slate-600"
                    placeholder="Paste your PRD, design doc, or rough notes here..."
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={handleManualCreate}
                    disabled={!newTitle.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                  >
                    Create Manually
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeProject ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setSelectedId(null)}
              className="mb-6 text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              ← Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Project Info */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl sticky top-24">
                  <h2 className="text-2xl font-bold text-white mb-2">{activeProject.title}</h2>
                  {activeProject.repoUrl && (
                    <a
                      href={activeProject.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mb-6 inline-flex transition-colors"
                    >
                      <Github className="w-3 h-3" />
                      {activeProject.repoUrl.replace('https://github.com/', '')}
                    </a>
                  )}

                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Description</label>
                      <textarea
                        value={activeProject.description}
                        onChange={(e) => updateProjectDescription(activeProject.id, e.target.value)}
                        className="w-full bg-slate-950/30 text-slate-300 text-sm leading-relaxed focus:outline-none focus:bg-slate-900/50 rounded-lg p-3 transition-colors resize-none border border-transparent focus:border-blue-500/30"
                        rows={4}
                        placeholder="Add a description..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Scope</label>
                      <input
                        type="text"
                        value={activeProject.scope}
                        onChange={(e) => updateProjectScope(activeProject.id, e.target.value)}
                        className="w-full bg-slate-950/30 text-slate-300 text-sm focus:outline-none focus:bg-slate-900/50 rounded-lg p-3 transition-colors border border-transparent focus:border-blue-500/30"
                        placeholder="Define project scope..."
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase mb-4">Project Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total Tasks</span>
                        <span className="font-mono text-slate-200">{stats.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400">Implemented</span>
                        <span className="font-mono text-emerald-400">{stats.stable}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-400">In Progress</span>
                        <span className="font-mono text-blue-400">
                          {stats.creating + stats.polishing}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Backlog</span>
                        <span className="font-mono text-slate-500">{stats.backlog}</span>
                      </div>
                    </div>
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

                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-slate-950/50">
                  <div className="grid grid-cols-12 bg-slate-950/50 border-b border-white/5 py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-6">Feature Name</div>
                    <div className="col-span-3">State</div>
                    <div className="col-span-3 text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-white/5">
                    {/* Add Feature Input Row */}
                    {isAddingFeature && (
                      <div className="grid grid-cols-12 items-center py-3 px-4 bg-blue-500/5 animate-in fade-in slide-in-from-top-2">
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
                            className="flex-1 bg-slate-950 border border-blue-500/30 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                            placeholder="Feature name..."
                          />
                          <button
                            onClick={() => saveNewFeature(activeProject.id)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors shadow-lg shadow-blue-500/20"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelAddingFeature}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {activeProject.features.length === 0 && !isAddingFeature && (
                      <div className="p-12 text-center text-slate-500 italic">
                        <div className="bg-slate-800/50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                          <Layout className="w-6 h-6 text-slate-600" />
                        </div>
                        <p>No features tracked yet.</p>
                        <p className="text-xs mt-1 opacity-70">Add a feature to get started.</p>
                      </div>
                    )}

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={activeProject.features.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {activeProject.features.map(feature => (
                          <SortableFeatureRow
                            key={feature.id}
                            id={feature.id}
                            feature={feature}
                            onExpand={(id) => toggleFeatureExpand(activeProject.id, id)}
                            onUpdateState={(id, s) => updateFeatureState(activeProject.id, id, s)}
                            onDelete={(id) => deleteFeature(activeProject.id, id)}
                            onSelect={(id) => setSelectedFeatureId(id)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
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
