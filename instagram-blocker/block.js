// ====== MODE SWITCHING ======
const readModeView = document.getElementById('read-mode-view');
const quizModeView = document.getElementById('quiz-mode-view');
const tabRead = document.getElementById('tab-read');
const tabQuiz = document.getElementById('tab-quiz');
const timerInfoContainer = document.getElementById('timer-info-container');
const progressContainer = document.getElementById('progress-container');

let currentMode = 'read'; // 'read' or 'quiz'

tabRead.addEventListener('click', () => {
    currentMode = 'read';
    tabRead.classList.add('active');
    tabQuiz.classList.remove('active');
    readModeView.classList.remove('hidden-view');
    quizModeView.classList.add('hidden-view');
    
    timerInfoContainer.style.visibility = 'visible';
    progressContainer.style.visibility = 'visible';
    document.getElementById('timer-message').textContent = "Complete your task to unlock Instagram.";
});

tabQuiz.addEventListener('click', () => {
    currentMode = 'quiz';
    tabQuiz.classList.add('active');
    tabRead.classList.remove('active');
    quizModeView.classList.remove('hidden-view');
    readModeView.classList.add('hidden-view');
    
    // Hide timer in quiz mode
    timerInfoContainer.style.visibility = 'hidden';
    progressContainer.style.visibility = 'hidden';
    document.getElementById('timer-message').textContent = "Answer 5 questions correctly to unlock.";
});

function applyInitialModeFromUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const mode = (params.get('mode') || '').toLowerCase();
    if (mode === 'quiz') {
        tabQuiz.click();
    } else if (mode === 'read') {
        tabRead.click();
    }
}

// ====== READING MODE LOGIC ======
const topicSelect = document.getElementById('topic-select');
let currentTopic = topicSelect.value;
let articleHistory = [];
let currentArticleIndex = -1;

const groqKeyStatus = document.getElementById('groq-key-status');

async function getGroqApiKey() {
    const result = await chrome.storage.local.get(['groqApiKey']);
    return result.groqApiKey || '';
}

async function setGroqApiKey(key) {
    await chrome.storage.local.set({ groqApiKey: key });
}

function sanitizeHtml(html) {
    if (typeof html !== 'string') return '';
    // Remove scripts/styles entirely
    html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
    // Remove inline event handlers (on*)
    html = html.replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '');
    // Strip links to enforce "no links"
    html = html.replace(/<a\b[^>]*>/gi, '<span>');
    html = html.replace(/<\/a>/gi, '</span>');
    return html;
}

async function generateArticleWithGroq(topic) {
    const apiKey = (await getGroqApiKey()).trim();
    if (!apiKey) return null;

    const prompt = `
You are writing a short learning note for a browser extension.
Topic: ${topic}

Requirements:
- Output must be VALID HTML ONLY (no markdown, no code fences).
- Allowed tags: h3, h4, p, ul, ol, li, strong, em, code.
- No links, no images, no external references, no citations, no <a>.
- No scripts, no styles.
- Length: 600 to 900 words.
- Make it accurate and practical: include examples, key terms, and common pitfalls.

Return ONLY the HTML body (no <html>, no <body>).
`.trim();

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.9,
            max_tokens: 1400,
            messages: [
                { role: 'system', content: 'You are a precise technical writer.' },
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!res.ok) {
        throw new Error(`Groq request failed: ${res.status}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq returned empty content');
    return sanitizeHtml(content);
}

async function initGroqKeyUi() {
    const existing = (await getGroqApiKey()).trim();
    groqKeyStatus.textContent = existing
        ? 'Groq enabled: new content will be generated each time you press Next.'
        : 'Groq disabled: using offline library content. To enable, add your Groq API key in Settings.';
}

topicSelect.addEventListener('change', (e) => {
    currentTopic = e.target.value;
    articleHistory = [];
    currentArticleIndex = -1;
    document.getElementById('next-article-btn').disabled = false;
    fetchAndRenderNewArticle();
});

document.getElementById('next-article-btn').addEventListener('click', () => {
    if (currentArticleIndex < articleHistory.length - 1) {
        currentArticleIndex++;
        renderArticle(articleHistory[currentArticleIndex]);
    } else {
        fetchAndRenderNewArticle();
    }
});

document.getElementById('prev-article-btn').addEventListener('click', () => {
    if (currentArticleIndex > 0) {
        currentArticleIndex--;
        renderArticle(articleHistory[currentArticleIndex]);
    }
});

async function fetchAndRenderNewArticle() {
    const normalizedTopic = currentTopic === 'ML' ? 'Machine Learning' : currentTopic;

    // Prefer Groq generation if key is present
    const tryGroqTopic = normalizedTopic === 'Machine Learning' ? 'Machine Learning (ML)' : normalizedTopic;
    const hasKey = (await getGroqApiKey()).trim().length > 0;

    if (hasKey) {
        document.getElementById('dynamic-header').innerHTML = `
            <div class="tag">${normalizedTopic.toUpperCase()}</div>
            <h1>Generating fresh content…</h1>
            <p class="subtitle">Please wait</p>
        `;
        document.getElementById('dynamic-content').innerHTML = `<p style="color: var(--text-secondary);">Creating a new explanation with examples (no links).</p>`;

        try {
            const html = await generateArticleWithGroq(tryGroqTopic);
            const now = new Date();
            const title = `${normalizedTopic} • ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            const articleObj = {
                topic: normalizedTopic,
                title,
                description: 'Generated fresh content (offline links disabled).',
                html,
                url: null
            };
            articleHistory.push(articleObj);
            currentArticleIndex = articleHistory.length - 1;
            renderArticle(articleObj);
            document.getElementById('next-article-btn').disabled = false;
            return;
        } catch (e) {
            groqKeyStatus.textContent = 'Groq error. Falling back to offline library content.';
        }
    }

    // Fallback: offline library content
    if (learningLibrary[normalizedTopic]) {
        const libraryArticles = learningLibrary[normalizedTopic];
        const readCount = articleHistory.filter(a => a.topic === normalizedTopic).length;
        if (libraryArticles.length > 0) {
            const article = libraryArticles[readCount % libraryArticles.length];
            const articleObj = {
                topic: normalizedTopic,
                title: article.title,
                description: article.description,
                html: article.html,
                url: null
            };
            articleHistory.push(articleObj);
            currentArticleIndex = articleHistory.length - 1;
            renderArticle(articleObj);
            document.getElementById('next-article-btn').disabled = false;
            return;
        }
    }

    document.getElementById('dynamic-header').innerHTML = '<h1>Content not available</h1>';
    document.getElementById('dynamic-content').innerHTML = `<p>Please add a Groq API key or use a supported topic.</p>`;
}

function renderArticle(articleObj) {
    document.getElementById('dynamic-header').innerHTML = `
        <div class="tag">${articleObj.topic.toUpperCase()}</div>
        <h1>${articleObj.title}</h1>
        <p class="subtitle">${articleObj.description}</p>
    `;
    document.getElementById('dynamic-content').innerHTML = `
        <div>${articleObj.html}</div>
    `;
    document.querySelector('.article-container').scrollTop = 0;
    
    const prevBtn = document.getElementById('prev-article-btn');
    if (currentArticleIndex > 0) {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    } else {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    }
}


// ====== NOTES LOGIC (from original) ======
const todayStr = new Date().toISOString().split('T')[0];
const storageKey = `notes_${todayStr}`;
const notesArea = document.getElementById('notes-area');
const saveStatus = document.getElementById('save-status');
const typingIndicator = document.getElementById('typing-indicator');

let isTyping = false;
let typingTimeout = null;
let saveTimeout = null;

const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('notes-date').textContent = new Date().toLocaleDateString(undefined, dateOptions);

async function loadNotes() {
    const result = await chrome.storage.local.get([storageKey]);
    if (result[storageKey]) {
        notesArea.value = result[storageKey];
    }
}

async function saveNotes() {
    const data = {};
    data[storageKey] = notesArea.value;
    await chrome.storage.local.set(data);
    saveStatus.textContent = "Saved locally ✓";
}

notesArea.addEventListener('input', () => {
    saveStatus.textContent = "Saving...";
    isTyping = true;
    typingIndicator.classList.remove('hidden');

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveNotes();
    }, 1000);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        typingIndicator.classList.add('hidden');
    }, 1500);
});


// ====== QUIZ MODE LOGIC ======
let quizQuestionsAnsweredCorrectly = 0;
const REQUIRED_QUIZ_SCORE = 5;

async function loadQuiz() {
    const container = document.getElementById('quiz-container-main');
    
    try {
        // Pick a random question from our internal database
        const randomIdx = Math.floor(Math.random() * indianExamQuestions.length);
        const questionData = indianExamQuestions[randomIdx];
        
        const question = questionData.question;
        const correct = questionData.correct_answer;
        const incorrects = questionData.incorrect_answers;
        
        const allAnswers = [correct, ...incorrects].sort(() => Math.random() - 0.5);
        
        let html = `
            <div style="background: rgba(0,0,0,0.02); padding: 30px; border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="display: inline-block; font-size: 13px; color: #f56300; font-weight: 600; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.05em;">
                    Indian Competitive Exams
                </div>
                <h4 style="font-size: 22px; margin-bottom: 30px; color: var(--text-primary); line-height: 1.4;">${question}</h4>
                <div style="display: flex; flex-direction: column; gap: 12px;">
        `;
        
        allAnswers.forEach((ans, idx) => {
            html += `<button class="quiz-btn" id="quiz-btn-${idx}" style="font-size: 16px; padding: 15px 20px;">${ans}</button>`;
        });
        
        html += `</div><p id="quiz-feedback" style="margin-top: 25px; font-weight: 600; font-size: 18px; text-align: center;"></p></div>`;
        
        container.innerHTML = html;
        
        allAnswers.forEach((ans, idx) => {
            document.getElementById(`quiz-btn-${idx}`).addEventListener('click', function() {
                if (this.disabled) return;
                
                const isCorrect = (ans === correct);
                const feedback = document.getElementById('quiz-feedback');
                
                // Disable all buttons to prevent multiple clicks
                document.querySelectorAll('.quiz-btn').forEach(btn => btn.disabled = true);
                
                if (isCorrect) {
                    this.style.backgroundColor = '#34c759';
                    this.style.borderColor = '#34c759';
                    this.style.color = 'white';
                    feedback.textContent = 'Correct! Preparing next question...';
                    feedback.style.color = '#34c759';
                    
                    quizQuestionsAnsweredCorrectly++;
                    document.getElementById('quiz-progress-text').textContent = `${quizQuestionsAnsweredCorrectly} / ${REQUIRED_QUIZ_SCORE}`;
                    
                    if (quizQuestionsAnsweredCorrectly >= REQUIRED_QUIZ_SCORE) {
                        setTimeout(() => {
                            unlockInstagramFromQuiz();
                        }, 1500);
                    } else {
                        setTimeout(loadQuiz, 2000);
                    }
                } else {
                    this.style.backgroundColor = '#ff3b30';
                    this.style.borderColor = '#ff3b30';
                    this.style.color = 'white';
                    feedback.textContent = "Incorrect. Loading another question...";
                    feedback.style.color = '#ff3b30';
                    
                    // Highlight correct answer
                    allAnswers.forEach((a, i) => {
                        if (a === correct) {
                            const correctBtn = document.getElementById(`quiz-btn-${i}`);
                            correctBtn.style.backgroundColor = '#34c759';
                            correctBtn.style.borderColor = '#34c759';
                            correctBtn.style.color = 'white';
                        }
                    });
                    
                    setTimeout(loadQuiz, 2500);
                }
            });
        });
        
    } catch (e) {
        container.innerHTML = '<p style="text-align: center;">Error loading quiz. Retrying...</p>';
        setTimeout(loadQuiz, 2000);
    }
}

async function unlockInstagramFromQuiz() {
    document.getElementById('quiz-container-main').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
            <h3 style="font-size: 24px; color: #34c759; margin-bottom: 10px;">Challenge Completed!</h3>
            <p style="font-size: 16px; color: var(--text-secondary); margin-bottom: 30px;">You've successfully answered 5 questions.</p>
        </div>
    `;
    
    // Stop reading timer just in case
    clearInterval(timerId);
    
    const btn = document.getElementById('unlock-btn');
    btn.classList.remove('hidden');
    
    const result = await chrome.storage.local.get(['stats']);
    let stats = result.stats;
    if (stats) {
        stats.allowanceMs += (2 * 60 * 1000); // Give 2 mins back
        await chrome.storage.local.set({ stats });
    }
    
    btn.addEventListener('click', () => {
        btn.textContent = "Redirecting...";
        window.location.href = "https://www.instagram.com";
    });
}


// ====== TIMER LOGIC (Only runs when in read mode) ======
const REQUIRED_TIME_SEC = 5 * 60; // 5 minutes
let remainingSec = REQUIRED_TIME_SEC;
let timerId = null;

function updateDisplay() {
    const m = Math.floor(remainingSec / 60).toString().padStart(2, '0');
    const s = (remainingSec % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
    
    const percentage = ((REQUIRED_TIME_SEC - remainingSec) / REQUIRED_TIME_SEC) * 100;
    document.getElementById('read-progress').style.width = `${percentage}%`;
}

async function finishReading() {
    clearInterval(timerId);
    document.getElementById('timer-message').textContent = "Time criteria met. You can continue or return to Instagram.";
    document.getElementById('timer-message').style.color = "#0071e3"; 
    
    const btn = document.getElementById('unlock-btn');
    btn.classList.remove('hidden');
    
    const result = await chrome.storage.local.get(['stats']);
    let stats = result.stats;
    if (stats) {
        stats.allowanceMs += (2 * 60 * 1000); 
        stats.readTimeMs += REQUIRED_TIME_SEC * 1000;
        await chrome.storage.local.set({ stats });
    }
    
    btn.addEventListener('click', () => {
        btn.textContent = "Redirecting...";
        window.location.href = "https://www.instagram.com";
    });
}

function tick() {
    if (document.hidden) return; 
    if (isTyping) return;
    if (currentMode !== 'read') return; // Do not tick if in quiz mode
    
    if (remainingSec > 0) {
        remainingSec--;
        updateDisplay();
    } else {
        finishReading();
    }
}

function handleVisibilityChange() {
    if (document.hidden) {
        document.body.classList.add('paused');
        clearInterval(timerId);
        timerId = null;
    } else {
        document.body.classList.remove('paused');
        if (!timerId && remainingSec > 0) {
            timerId = setInterval(tick, 1000);
        }
    }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

// Initialize everything
loadNotes();
fetchAndRenderNewArticle();
loadQuiz();
updateDisplay();
timerId = setInterval(tick, 1000);
initGroqKeyUi();
applyInitialModeFromUrl();
