const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const PORT = 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// In-memory usage tracking
let usageStore = {
    messageCount: 0,
    limit: 20
};

// Middleware to check limits
const checkLimit = (req, res, next) => {
    if (usageStore.messageCount >= usageStore.limit) {
        return res.status(429).json({ error: "Free limit reached" });
    }
    next();
};

async function callAI(messages) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Study Assistant App"
        },
        body: JSON.stringify({
            model: "google/gemini-2.0-flash-lite-preview-02-05:free",
            messages: [
                { role: "system", content: "You are a helpful AI study assistant that explains concepts clearly, gives structured answers, generates quizzes, and adapts based on student needs." },
                ...messages
            ]
        })
    });
    return await response.json();
}

app.get('/api/usage', (req, res) => {
    res.json(usageStore);
});

app.post('/api/chat', checkLimit, async (req, res) => {
    try {
        const { message } = req.body;
        const data = await callAI([{ role: "user", content: message }]);
        usageStore.messageCount++;
        res.json({ reply: data.choices[0].message.content, count: usageStore.messageCount });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch AI response" });
    }
});

app.post('/api/quiz', checkLimit, async (req, res) => {
    try {
        const { topic } = req.body;
        const prompt = `Generate a quiz on ${topic}. Provide exactly 5 questions. Mix of MCQ and Short answer. Return ONLY as a JSON array of objects: [{"question": "...", "type": "MCQ", "options": ["A","B","C","D"]}, {"question": "...", "type": "Short"}]`;
        const data = await callAI([{ role: "user", content: prompt }]);
        usageStore.messageCount++;
        
        // Extract JSON from AI string (cleaning potential markdown markers)
        const cleanContent = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        res.json({ quiz: JSON.parse(cleanContent), count: usageStore.messageCount });
    } catch (error) {
        res.status(500).json({ error: "Failed to generate quiz" });
    }
});

app.post('/api/theory', checkLimit, async (req, res) => {
    try {
        const { topic } = req.body;
        const prompt = `Explain the concept of ${topic} in a structured format with headings, bullet points, and an example.`;
        const data = await callAI([{ role: "user", content: prompt }]);
        usageStore.messageCount++;
        res.json({ theory: data.choices[0].message.content, count: usageStore.messageCount });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch theory" });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));