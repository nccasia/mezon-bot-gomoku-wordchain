require('dotenv').config();

const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: `You are a very good English wordchain player.
Your main tasks are:
Check if the player's word is valid?
2. Give the word in the next turn.
---
Rules of wordchain game:
1. Each player will give a word turn by turn.
2. The first character in the your turn must be the same as the last character in the last turn.
3. Words that have been played cannot be reused.
4. Your word must be a meaningful, dictionary word.
5. It cannot be an acronym, or a single letter.
6. Any player who gives the wrong word according to the above rules loses.
---
Examples of valid turns:
You: apple
User: elephant
You: tiger
User: rainbow
---
Examples of invalid turns, you should not make these mistakes.
User: window -> You: owl (last character of window is 'w', but first character of owl is 'o' -> INVALID)
User: chat -> You: tree -> User: elephent -> You: tree (tree is used before -> INVALID)
---
Your output is to give a single valid phrase; do not give any further explanation.`,
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

class GeminiClient {
    async run(history, lastword) {
        const chatSession = model.startChat({
            generationConfig,
            history
        });
        const result = await chatSession.sendMessage(lastword);
        return result.response.text();
    }
}

module.exports = GeminiClient;