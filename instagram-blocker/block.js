const allArticles = [
  {
    tag: "Artificial Intelligence",
    title: "The Evolution of Generative AI",
    subtitle: "How massive neural networks and transformer architectures are reshaping the way we interact with technology.",
    content: `
      <p>Generative Artificial Intelligence represents a paradigm shift in how we approach computing. Unlike traditional programming where rules are explicitly defined by humans, neural networks learn patterns directly from massive datasets. This shift from deterministic execution to probabilistic induction has enabled breakthroughs that were previously thought impossible.</p>
      <h2>The Transformer Architecture</h2>
      <p>At the heart of the current AI boom is the Transformer architecture, introduced by researchers at Google in 2017. Before Transformers, sequence processing relied heavily on Recurrent Neural Networks (RNNs) and Long Short-Term Memory (LSTM) networks.</p>
    `
  },
  {
    tag: "Artificial Intelligence",
    title: "The Future of Reinforcement Learning",
    subtitle: "Teaching AI through trial, error, and dynamic environments.",
    content: `
      <p>Reinforcement learning (RL) is a training machine learning model to make a sequence of decisions. The agent learns to achieve a goal in an uncertain, potentially complex environment by trial and error.</p>
      <h2>Beyond Games</h2>
      <p>While RL gained fame by beating human champions at Go and StarCraft, its real-world applications are expanding rapidly into robotics, self-driving cars, and automated trading algorithms.</p>
    `
  },
  {
    tag: "Machine Learning",
    title: "Unsupervised Learning Explained",
    subtitle: "Discovering hidden structures in massive datasets without human labels or intervention.",
    content: `
      <p>In traditional machine learning, models learn by looking at examples. Unsupervised learning takes a radically different approach: it operates entirely without labels.</p>
      <h2>Clustering and Patterns</h2>
      <p>When an unsupervised algorithm is fed billions of data points, it naturally clusters similar items together, finding complex statistical relationships that humans would never notice.</p>
    `
  },
  {
    tag: "Machine Learning",
    title: "Supervised Learning Fundamentals",
    subtitle: "The backbone of modern predictive algorithms.",
    content: `
      <p>Supervised learning is built on predicting a known outcome. By feeding an algorithm historical data mapped to specific labels, the model learns the relationship between the input features and the target variable.</p>
      <h2>Regression vs. Classification</h2>
      <p>Depending on the goal, supervised learning can output a continuous number (regression, like predicting house prices) or a discrete category (classification, like identifying spam emails).</p>
    `
  },
  {
    tag: "Deep Learning",
    title: "Deep Learning Architectures",
    subtitle: "How multi-layered artificial neurons process complex data flows.",
    content: `
      <p>Deep Learning refers to the use of artificial neural networks with multiple layers. While a simple neural network might have one or two hidden layers of nodes, deep learning models often stack dozens of layers.</p>
      <h2>From Pixels to Concepts</h2>
      <p>In a deep learning model designed for vision, the first layer might simply detect edges and contrasts. The second layer combines those edges to find simple shapes like circles or corners.</p>
    `
  },
  {
    tag: "Deep Learning",
    title: "Understanding CNNs",
    subtitle: "How Convolutional Neural Networks revolutionized computer vision.",
    content: `
      <p>Convolutional Neural Networks (CNNs) are specialized deep learning architectures designed to process grid-like topology, such as images. They are vastly superior to standard networks for image recognition.</p>
      <h2>Feature Maps</h2>
      <p>By sliding a mathematical filter across an image, CNNs create feature maps that capture spatial hierarchies, allowing the network to recognize an object regardless of where it appears in the frame.</p>
    `
  },
  {
    tag: "Trending News",
    title: "Global Tech Markets Rally",
    subtitle: "Investors show renewed confidence in AI and renewable energy sectors.",
    content: `
      <p>Today marks a significant surge across global technology markets, heavily driven by back-to-back announcements in the AI and renewable energy sectors. Major indices showed their highest single-day climb in over a year.</p>
      <h2>AI Hardware Breakthroughs</h2>
      <p>Driving the rally is the unexpected announcement of a new generation of neural processing units (NPUs) that claim to cut the energy consumption of large language model inference by up to 60%.</p>
    `
  },
  {
    tag: "Trending News",
    title: "Breakthrough in Solid-State Batteries",
    subtitle: "New manufacturing process promises to double EV range within two years.",
    content: `
      <p>A major consortium of automotive manufacturers released a joint press statement today detailing a scalable manufacturing technique for solid-state batteries. The technology swaps liquid electrolytes for a solid, fire-resistant ceramic material.</p>
      <h2>The Path to Market</h2>
      <p>Industry experts predict that vehicles equipped with these new cells will hit the consumer market as early as next fall, potentially changing the landscape of sustainable transit entirely.</p>
    `
  }
];

let articles = allArticles;

let currentArticleIndex = 0;

function loadArticle(index) {
  const article = articles[index];
  document.getElementById('dynamic-header').innerHTML = `
      <div class="tag">${article.tag}</div>
      <h1>${article.title}</h1>
      <p class="subtitle">${article.subtitle}</p>
  `;
  document.getElementById('dynamic-content').innerHTML = article.content;
  document.querySelector('.article-container').scrollTop = 0;
}

document.getElementById('next-article-btn').addEventListener('click', () => {
    currentArticleIndex = (currentArticleIndex + 1) % articles.length;
    loadArticle(currentArticleIndex);
});

document.getElementById('prev-article-btn').addEventListener('click', () => {
    currentArticleIndex = (currentArticleIndex - 1 + articles.length) % articles.length;
    loadArticle(currentArticleIndex);
});

// Timer Logic
const REQUIRED_TIME_SEC = 5 * 60; // 5 minutes
let remainingSec = REQUIRED_TIME_SEC;
let timerId = null;
let isTyping = false;
let typingTimeout = null;
let saveTimeout = null;

const todayStr = new Date().toISOString().split('T')[0];
const storageKey = `notes_${todayStr}`;

const notesArea = document.getElementById('notes-area');
const saveStatus = document.getElementById('save-status');
const typingIndicator = document.getElementById('typing-indicator');

const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('notes-date').textContent = new Date().toLocaleDateString(undefined, dateOptions);

async function loadNotes() {
    const result = await chrome.storage.local.get([storageKey, 'prefTopic']);
    
    // Filter articles based on preference
    if (result.prefTopic && result.prefTopic !== 'Any') {
        articles = allArticles.filter(a => a.tag === result.prefTopic);
    } else {
        articles = allArticles;
    }
    
    if (articles.length === 0) articles = allArticles; // fallback

    // Also load random starting article to keep it fresh
    currentArticleIndex = Math.floor(Math.random() * articles.length);
    loadArticle(currentArticleIndex);
    
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

function updateDisplay() {
    const m = Math.floor(remainingSec / 60).toString().padStart(2, '0');
    const s = (remainingSec % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
    
    const percentage = ((REQUIRED_TIME_SEC - remainingSec) / REQUIRED_TIME_SEC) * 100;
    document.getElementById('read-progress').style.width = `${percentage}%`;
}

async function finishReading() {
    clearInterval(timerId);
    document.getElementById('timer-message').textContent = "Time criteria met. You can continue reading or return.";
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

loadNotes();
updateDisplay();
timerId = setInterval(tick, 1000);
