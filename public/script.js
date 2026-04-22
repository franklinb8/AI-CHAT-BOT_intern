/**
 * UI & Logic for AI Study Assistant (Neon Edition)
 */

// Updates the neon usage bar and text across pages
async function updateUsage() {
    try {
        const res = await fetch('/api/usage');
        const data = await res.json();
        
        const percent = (data.messageCount / data.limit) * 100;
        const fill = document.getElementById('usage-fill');
        const text = document.getElementById('usage-text');
        
        if (fill) {
            fill.style.width = `${percent}%`;
            // Add a "critical" glow if near limit
            if (percent > 80) fill.style.boxShadow = '0 0 15px #ff007f';
        }
        
        if (text) {
            text.innerHTML = `<span style="color: var(--neon-blue)">${data.messageCount}</span> / <span style="color: var(--neon-purple)">${data.limit}</span> messages used`;
        }
        
        return data.messageCount >= data.limit;
    } catch (err) {
        console.error("Usage sync failed:", err);
    }
}

// Handles Chat System
async function sendMessage() {
    const input = document.getElementById('user-input');
    const container = document.getElementById('chat-container');
    const text = input.value.trim();
    
    if (!text) return;

    // 1. Add User Message (Purple Glow)
    appendMessage('user', text);
    input.value = '';

    // 2. Add Thinking Indicator (Neon Pulse)
    const thinkingId = 'think-' + Date.now();
    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = thinkingId;
    thinkingDiv.className = 'message ai-msg thinking';
    thinkingDiv.innerHTML = `<span class="pulse">●</span> Thinking...`;
    container.appendChild(thinkingDiv);
    container.scrollTop = container.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        
        const data = await response.json();
        document.getElementById(thinkingId).remove();

        if (data.error) {
            appendMessage('ai', "⚠️ SYSTEM OVERLOAD: Free tier limit reached. Upgrade for infinite access.");
        } else {
            appendMessage('ai', data.reply);
        }
        
        // Update usage bar after AI responds
        updateUsage();
        
    } catch (e) {
        const loader = document.getElementById(thinkingId);
        if (loader) loader.innerText = "CONNECTION ERROR: Server unreachable.";
    }
}

// Renders Message Bubbles with Neon Classes
function appendMessage(role, text) {
    const container = document.getElementById('chat-container');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}-msg`;
    
    // Support for basic formatting (newlines)
    msgDiv.style.whiteSpace = "pre-wrap";
    msgDiv.innerText = text;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// Handles Quiz Generation with Neon Cards
async function generateQuiz() {
    const topicInput = document.getElementById('quiz-topic');
    const container = document.getElementById('quiz-results');
    
    if (!topicInput || !topicInput.value.trim()) return;
    const topic = topicInput.value.trim();

    container.innerHTML = '<p class="thinking" style="grid-column: 1/-1; text-align: center;">Initializing Neon Quiz Modules...</p>';
    
    try {
        const res = await fetch('/api/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        });
        const data = await res.json();
        
        container.innerHTML = ''; // Clear loader

        if (data.error) {
            container.innerHTML = '<p style="color: var(--neon-pink); grid-column: 1/-1; text-align: center;">Limit Reached! Cannot generate more quizzes.</p>';
            return;
        }

        data.quiz.forEach((q, i) => {
            const card = document.createElement('div');
            card.className = 'card'; // Inherits hover glow from CSS
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">MODULE ${i+1}</h3>
                    <span style="font-size:0.7rem; color:var(--neon-green); border:1px solid var(--neon-green); padding:2px 6px; border-radius:4px;">${q.type}</span>
                </div>
                <p style="margin-bottom: 15px; font-size: 1.05rem; color: #fff;">${q.question}</p>
                ${q.options ? `
                    <ul style="list-style:none; display:flex; flex-direction:column; gap:10px;">
                        ${q.options.map(o => `
                            <li style="padding:10px; background: rgba(255,255,255,0.05); border-radius:8px; border-left:4px solid var(--neon-blue); font-size:0.9rem;">
                                ${o}
                            </li>`).join('')}
                    </ul>
                ` : '<div style="height:40px; border: 1px dashed var(--border-color); border-radius:8px; display:flex; align-items:center; padding-left:10px; color:var(--text-muted); font-size:0.8rem;">Type answer here...</div>'}
            `;
            container.appendChild(card);
        });
        
        updateUsage();
        
    } catch (e) {
        container.innerHTML = '<p style="color: var(--neon-pink);">Failed to connect to Neural Network.</p>';
    }
}

// Global Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // 1. Enter Key Support for Chat
    const inputField = document.getElementById('user-input');
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // 2. Initial Usage Sync (for Profile/Account/Chat pages)
    updateUsage();
});