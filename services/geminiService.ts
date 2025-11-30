import { GoogleGenAI } from "@google/genai";
import { VKPost } from "../types";

export const generateSummary = async (
  communityName: string,
  posts: VKPost[]
): Promise<string> => {
  if (!process.env.API_KEY) {
    // If no API key, we just return a generic message, but we prefer to have one.
    return "Gemini API Key is missing. Cannot generate summary.";
  }

  if (posts.length === 0) {
    return "No posts found in this period.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare the content for Gemini
  // We take the top 15 posts to avoid context limit issues and keep it focused
  const postsContent = posts.slice(0, 15).map((p, i) => `
    Post #${i + 1}
    Date: ${p.date}
    Likes: ${p.likes}
    Comments: ${p.comments}
    Reposts: ${p.reposts}
    Text: ${p.text.substring(0, 400).replace(/\n/g, ' ')}...
  `).join('\n\n');

  const prompt = `
    I have analyzed the most popular posts from the VKontakte community "${communityName}".
    Here are the top posts based on engagement (Likes/Comments):

    ${postsContent}

    Please write a concise, insightful summary (2-3 paragraphs) explaining:
    1. What topics were most popular with the audience during this period?
    2. What kind of content (news, memes, announcements, discussions) triggered the most engagement?
    3. Any notable specific events mentioned.

    Keep the tone professional yet engaging.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Could not generate summary.";

  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "An error occurred while generating the AI summary.";
  }
};
