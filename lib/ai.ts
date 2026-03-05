import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;

export const openrouter = apiKey
  ? new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    })
  : null;

