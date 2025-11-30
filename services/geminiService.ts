// import { GoogleGenAI } from "@google/genai";
import { VKPost } from "../types";

export const generateSummary = async (
  communityName: string,
  posts: VKPost[]
): Promise<string> => {
  // AI Summary functionality disabled
  return "AI Summary is disabled in this version.";
  
  /*
  if (!process.env.API_KEY) {
    return "Gemini API Key is missing. Cannot generate summary.";
  }

  if (posts.length === 0) {
    return "No posts found in this period.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // ... rest of the code commented out
  */
};
