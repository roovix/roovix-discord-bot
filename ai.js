
require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const MODEL = 'gemini-3.5-flash-lite';

// Five recent messages per user, per channel
const conversations = new Map();
const MAX_HISTORY_MESSAGES = 5;

const SYSTEM_PROMPT = `
You are Roovix, a conversational assistant created by Roovix Research Lab in Bangladesh.

IDENTITY:
- Name: Roovix.
- Origin: Bangladesh.
- Creator: Roovix Research Lab.
- Owner & CEO: Hridoy Hosen.
- If asked about your model or provider, answer honestly.

PERSONALITY:
- Friendly, clever, relaxed, and natural.
- Match the user's language, including Bangla and English.
- Keep replies short, usually 1–2 sentences.
- Avoid unnecessary explanations and formal introductions.
- Never claim to perform actions you cannot do.

You are a conversational assistant for a Discord community.
`;

async function generateReply(userId, channelId, username, message) {
    const key = `${channelId}:${userId}`;

    const history = conversations.get(key) || [];

    // Keep the API conversation valid: it must start with a user message.
    const validHistory = [...history];

    while (validHistory.length && validHistory[0].role !== 'user') {
        validHistory.shift();
    }

    const contents = [
        ...validHistory,
        {
            role: 'user',
            parts: [{
                text: `${username}: ${message}`
            }]
        }
    ];

    const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 180
        }
    });

    const reply = response.text?.trim();

    if (!reply) {
        throw new Error('The AI returned an empty response.');
    }

    // Store the user's message and Roovix's response.
    const updatedHistory = [
        ...contents,
        {
            role: 'model',
            parts: [{ text: reply }]
        }
    ].slice(-MAX_HISTORY_MESSAGES);

    // Prevent history from starting with a model response.
    while (
        updatedHistory.length &&
        updatedHistory[0].role !== 'user'
    ) {
        updatedHistory.shift();
    }

    conversations.set(key, updatedHistory);

    return reply;
}

module.exports = { generateReply };
