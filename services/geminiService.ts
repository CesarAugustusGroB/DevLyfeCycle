import { GoogleGenAI } from "@google/genai";
import { Project, Feature, ProjectAnalysisResponse, FeatureExpansionResponse } from '../types';

// Robust JSON cleaner to strip Markdown code blocks
const cleanJSON = (text: string): string => {
  return text.replace(/```json|```/g, '').trim();
};

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeProjectRequirements = async (
  designDoc: string, 
  titlePreference: string
): Promise<ProjectAnalysisResponse> => {
  const ai = getAI();
  
  const systemPrompt = `You are a Technical Project Manager. 
  Analyze the user's unstructured design document text. 
  Extract:
  1. Project title (if not provided, create a catchy one)
  2. Short technical description
  3. **Goal**: A concise statement of what "Done" looks like (Scope).
  4. List of features. 
  
  Return ONLY JSON in this format:
  {
    "title": "string",
    "description": "string",
    "goal": "string",
    "features": [ { "name": "string", "notes": "string" } ]
  }`;

  const userContext = `User Title Preference: ${titlePreference || "None"}. \n\n Design Document: ${designDoc}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: userContext,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(cleanJSON(text));
  } catch (error) {
    console.error("Project Analysis Error:", error);
    throw new Error("Failed to analyze project requirements.");
  }
};

export const expandFeature = async (
  feature: Feature, 
  projectContext: string
): Promise<FeatureExpansionResponse> => {
  const ai = getAI();

  const systemPrompt = `You are a Senior Developer. 
  Given a feature name and current project context, break this feature down into 3-5 specific, smaller sub-tasks.
  If context files are provided, analyze their code/content to suggest specific implementation steps or refactors.
  Return ONLY JSON: { "subtasks": [ { "name": "string", "notes": "string" } ] }`;

  let context = `Project Context: ${projectContext}. \n Feature to Expand: ${feature.name} (${feature.notes})`;

  if (feature.contextFiles && feature.contextFiles.length > 0) {
    context += `\n\n--- ATTACHED CONTEXT FILES (Code/Docs) ---\n`;
    feature.contextFiles.forEach(file => {
      context += `\n[FILE: ${file.name}]\n${file.content}\n--- END FILE ---\n`;
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: context,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(cleanJSON(text));
  } catch (error) {
    console.error("Feature Expansion Error:", error);
    throw new Error("Failed to expand feature.");
  }
};

export const generateStatusReport = async (project: Project): Promise<string> => {
  const ai = getAI();

  const systemPrompt = `You are a Project Manager. Generate a concise status report for this project.
  Compare current status against the Project Goal: "${project.goal}".
  Summarize progress based on the state of features (CREATING, FIX/POLISH, STABLE).
  Format output as a clean string suitable for a clipboard copy.`;

  const projectJson = JSON.stringify({
    title: project.title,
    desc: project.description,
    features: project.features.map(f => ({ name: f.name, state: f.state }))
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate report for: ${projectJson}`,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });

    return cleanJSON(response.text || "Error generating report.");
  } catch (error) {
    console.error("Report Generation Error:", error);
    throw new Error("Failed to generate report.");
  }
};
