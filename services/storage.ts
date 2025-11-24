import { Project } from '../types';

const STORAGE_KEY = 'devlifecycle_projects_v1';

export const saveProjects = (projects: Project[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Failed to save projects to localStorage:', error);
  }
};

export const loadProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load projects from localStorage:', error);
    return [];
  }
};