import { GoogleGenerativeAI } from "@google/generative-ai";

let _model = null;

export const getModel = () => {
  if (!_model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY not set in environment');
    }
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      _model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } catch (error) {
      console.error('Failed to initialize Gemini model:', error.message);
      throw new Error('Failed to initialize Gemini AI');
    }
  }
  return _model;
};

// Keep backward compat
export const model = {
  generateContent: (prompt) => getModel().generateContent(prompt),
};
