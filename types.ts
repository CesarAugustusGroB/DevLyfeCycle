
export type LifecycleState = 'BACKLOG' | 'CREATING' | 'FIX/POLISH' | 'EXPANDING' | 'STABLE';

export interface ContextFile {
  id: string;
  name: string;
  content: string;
  type: string;
}

export interface Feature {
  id: string;
  name: string;
  state: LifecycleState;
  notes: string;
  subfeatures: Feature[];
  isExpanded: boolean;
  contextFiles: ContextFile[];
}

export interface Project {
  id: string;
  title: string;
  repoUrl: string;
  description: string;
  scope: string;
  goal: string;
  features: Feature[];
  lastUpdated: string;
}

export interface ProjectAnalysisResponse {
  title: string;
  description: string;
  scope: string;
  goal: string;
  features: { name: string; notes: string }[];
}

export interface FeatureExpansionResponse {
  subtasks: { name: string; notes: string }[];
}
