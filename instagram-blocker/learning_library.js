const learningLibrary = {
    "AI": [
        {
            title: "AI Basics: What It Is (and Isn’t)",
            description: "Clear foundations: narrow vs general AI, core capabilities, and common misconceptions.",
            html: `
                <h3>1. Definition</h3>
                <p><strong>Artificial Intelligence (AI)</strong> is the field of building systems that perform tasks normally associated with human intelligence—such as perception, language understanding, reasoning, and decision-making.</p>

                <h3>2. Narrow AI vs. General AI</h3>
                <ul>
                    <li><strong>Narrow AI:</strong> Works well on specific tasks (spam detection, face recognition, translation, recommendations).</li>
                    <li><strong>General AI (AGI):</strong> A hypothetical system that can learn and perform a wide range of tasks at human level. We do not have AGI today.</li>
                </ul>

                <h3>3. How AI “Works” in Practice</h3>
                <p>Modern AI is mostly <strong>data + algorithms + compute</strong>. Many systems learn statistical patterns from large datasets and then use those learned patterns to make predictions or generate outputs.</p>

                <h3>4. AI vs. Automation</h3>
                <p><strong>Automation</strong> follows fixed rules. <strong>AI</strong> can adapt based on data (e.g., a model that improves as it sees more examples). In real products, you often see a mix: rule-based checks + ML models.</p>

                <h3>5. Where ML Fits</h3>
                <p><strong>Machine Learning (ML)</strong> is a subfield of AI focused on learning from data. Most “AI” you encounter today is ML-based.</p>
            `
        },
        {
            title: "Key AI Concepts: Data, Models, Training, Inference",
            description: "Understand the lifecycle from collecting data to serving predictions safely.",
            html: `
                <h3>1. Data</h3>
                <p>AI systems rely on data: text, images, click logs, sensor readings, labeled examples, and more. Data quality often matters more than fancy algorithms.</p>

                <h3>2. Model</h3>
                <p>A <strong>model</strong> is a parameterized function (often with millions/billions of parameters) that maps inputs to outputs—like “email text → spam probability”.</p>

                <h3>3. Training</h3>
                <p><strong>Training</strong> is the optimization process where the model learns parameters that reduce error on training data. Common issues:</p>
                <ul>
                    <li><strong>Overfitting:</strong> memorizing training data, failing to generalize.</li>
                    <li><strong>Data leakage:</strong> accidentally training on information that won’t be available in real use.</li>
                    <li><strong>Bias:</strong> systematic performance differences across groups due to data and design.</li>
                </ul>

                <h3>4. Inference</h3>
                <p><strong>Inference</strong> is using a trained model to make predictions on new inputs. In production, inference is shaped by latency, cost, and reliability constraints.</p>

                <h3>5. Evaluation & Monitoring</h3>
                <p>Offline metrics (accuracy, F1, BLEU) are not enough. You also need production monitoring for drift (data changes), failure modes, and safety issues.</p>
            `
        }
    ],
    "Vector DB": [
        {
            title: "Vector Databases: The Core Idea",
            description: "Embeddings, similarity search, and why vector DBs exist.",
            html: `
                <h3>1. What is a Vector Database?</h3>
                <p>A <strong>vector database</strong> stores and searches high-dimensional numeric vectors (called <strong>embeddings</strong>). It’s optimized for “find things that are semantically similar,” not just exact keyword matches.</p>

                <h3>2. What Are Embeddings?</h3>
                <p>An <strong>embedding</strong> is a list of numbers that represents meaning. For text, similar sentences end up with vectors that are close to each other in vector space.</p>

                <h3>3. Similarity Search</h3>
                <p>Common similarity metrics:</p>
                <ul>
                    <li><strong>Cosine similarity:</strong> compares direction (angle) between vectors.</li>
                    <li><strong>Dot product:</strong> often used with normalized vectors.</li>
                    <li><strong>Euclidean distance:</strong> geometric distance between points.</li>
                </ul>
                <p>Because datasets can be huge, vector DBs use <strong>approximate nearest neighbor (ANN)</strong> indexes (e.g., HNSW, IVF) to search quickly.</p>

                <h3>4. Typical Use Cases</h3>
                <ul>
                    <li>Semantic search (find relevant docs even without exact keywords)</li>
                    <li>Recommendation systems</li>
                    <li>Deduplication / near-duplicate detection</li>
                    <li>Retrieval-Augmented Generation (RAG)</li>
                </ul>
            `
        },
        {
            title: "Designing a Vector Search System",
            description: "Chunking, metadata filters, freshness, and evaluation.",
            html: `
                <h3>1. Chunking Strategy</h3>
                <p>For long documents, you typically split content into <strong>chunks</strong> (e.g., 200–800 tokens) so retrieval returns focused passages.</p>

                <h3>2. Metadata & Hybrid Search</h3>
                <p>Vector search is often paired with <strong>metadata filters</strong> (language, date, product area, permissions) and sometimes <strong>keyword BM25</strong> (hybrid search) to improve precision.</p>

                <h3>3. Freshness & Updates</h3>
                <p>Plan for updates: re-embedding changed content, handling deletes, and rebuilding indexes if needed.</p>

                <h3>4. Measuring Quality</h3>
                <p>Evaluate retrieval with metrics like <strong>Recall@k</strong>, <strong>MRR</strong>, and human relevance judgments. Poor retrieval leads to poor downstream answers—even if the LLM is strong.</p>

                <h3>5. Security & Access Control</h3>
                <p>If documents have permissions, enforce them at retrieval time using per-user filters or per-tenant collections to prevent leakage.</p>
            `
        }
    ],
    "RAG": [
        {
            title: "RAG Explained: Better Answers with Retrieval",
            description: "Why LLMs hallucinate and how retrieval helps.",
            html: `
                <h3>1. The Problem</h3>
                <p>LLMs generate text based on patterns in training data. They can produce fluent but incorrect statements (<strong>hallucinations</strong>), especially for niche or rapidly changing facts.</p>

                <h3>2. What is RAG?</h3>
                <p><strong>Retrieval-Augmented Generation (RAG)</strong> is an architecture that <strong>retrieves</strong> relevant documents (from a knowledge base) and then uses the LLM to generate an answer grounded in that retrieved context.</p>

                <h3>3. High-Level Pipeline</h3>
                <ol>
                    <li><strong>Index:</strong> chunk documents and store embeddings in a vector DB.</li>
                    <li><strong>Retrieve:</strong> embed the user question and fetch top-k similar chunks.</li>
                    <li><strong>Generate:</strong> prompt the LLM with the retrieved chunks + question to produce an answer.</li>
                </ol>

                <h3>4. Why It Helps</h3>
                <ul>
                    <li>Improves factuality by providing source context</li>
                    <li>Enables answers from private/internal data</li>
                    <li>Reduces need for full model retraining</li>
                </ul>
            `
        },
        {
            title: "RAG Pitfalls (and How to Fix Them)",
            description: "Common failure modes: bad retrieval, context overload, and citation drift.",
            html: `
                <h3>1. Retrieval Failure</h3>
                <p>If retrieval returns irrelevant chunks, generation will be wrong. Fixes include better chunking, better embeddings, hybrid search, and re-ranking.</p>

                <h3>2. Context Overload</h3>
                <p>Stuffing too many chunks can reduce quality. Prefer fewer, higher-quality passages and use re-rankers to select the best.</p>

                <h3>3. Mismatched Granularity</h3>
                <p>If chunks are too small, they lose meaning; too large, retrieval becomes noisy. Tune chunk size and overlap based on the domain.</p>

                <h3>4. Prompting & Grounding</h3>
                <p>Tell the model to use only provided context when answering. If the context is insufficient, the model should say “I don’t know” or ask a clarifying question.</p>

                <h3>5. Evaluation</h3>
                <p>Evaluate end-to-end: retrieval quality + answer correctness. Track failures to improve the knowledge base and retrieval settings.</p>
            `
        }
    ],
    "Machine Learning": [
        {
            title: "The Fundamentals of Machine Learning",
            description: "A comprehensive guide to supervised, unsupervised, and reinforcement learning.",
            html: `
                <h3>1. What is Machine Learning?</h3>
                <p>Machine Learning (ML) is a subfield of artificial intelligence that focuses on building systems that can learn from and make decisions based on data. Unlike traditional programming, where a developer writes explicit rules, ML algorithms use statistical techniques to find patterns in data and improve their performance over time.</p>
                
                <h3>2. The Three Main Paradigms</h3>
                <p><strong>Supervised Learning:</strong> This is the most common form of ML. The algorithm is trained on a labeled dataset, meaning each input is paired with the correct output. Common tasks include:
                    <ul>
                        <li><strong>Regression:</strong> Predicting continuous values (e.g., house prices).</li>
                        <li><strong>Classification:</strong> Categorizing data into classes (e.g., spam vs. not spam).</li>
                    </ul>
                </p>
                <p><strong>Unsupervised Learning:</strong> Here, the algorithm works with unlabeled data. It tries to find hidden structures or patterns on its own.
                    <ul>
                        <li><strong>Clustering:</strong> Grouping similar data points together (e.g., customer segmentation).</li>
                        <li><strong>Dimensionality Reduction:</strong> Simplifying data without losing its essence (e.g., PCA).</li>
                    </ul>
                </p>
                <p><strong>Reinforcement Learning (RL):</strong> Inspired by behavioral psychology, RL involves an "agent" that learns to make decisions by performing actions in an environment to maximize a reward. It's the technology behind AlphaGo and self-driving cars.</p>
                
                <h3>3. The Machine Learning Workflow</h3>
                <p>A typical ML project follows these steps:
                    <ol>
                        <li><strong>Data Collection:</strong> Gathering raw data from various sources.</li>
                        <li><strong>Data Preprocessing:</strong> Cleaning, normalizing, and handling missing values.</li>
                        <li><strong>Feature Engineering:</strong> Selecting the most relevant variables for the model.</li>
                        <li><strong>Model Selection:</strong> Choosing the right algorithm (e.g., Random Forest, SVM).</li>
                        <li><strong>Training:</strong> Feeding data into the algorithm to learn patterns.</li>
                        <li><strong>Evaluation:</strong> Testing the model on unseen data using metrics like Accuracy, Precision, and Recall.</li>
                        <li><strong>Deployment:</strong> Integrating the model into a real-world application.</li>
                    </ol>
                </p>
            `
        },
        {
            title: "Linear and Logistic Regression: The Bedrock of ML",
            description: "Understanding the most fundamental statistical models.",
            html: `
                <h3>1. Linear Regression</h3>
                <p>Linear regression is used to model the relationship between a dependent variable and one or more independent variables by fitting a linear equation to observed data. The simplest form is <em>y = mx + b</em>.</p>
                <p>The goal is to find the line that minimizes the sum of squared errors (the distance between the actual data points and the line). This is known as <strong>Ordinary Least Squares (OLS)</strong>.</p>
                
                <h3>2. Logistic Regression</h3>
                <p>Despite its name, Logistic Regression is used for <strong>Classification</strong>, not regression. It predicts the probability that a given input belongs to a certain category (e.g., 0 or 1).</p>
                <p>It uses the <strong>Sigmoid Function</strong> to map any real-valued number into a value between 0 and 1: <em>1 / (1 + e^-z)</em>. If the output is > 0.5, we classify it as 1; otherwise, 0.</p>
            `
        }
    ],
    "Deep Learning": [
        {
            title: "Neural Networks: The Architecture of Thought",
            description: "An in-depth look at neurons, layers, and forward propagation.",
            html: `
                <h3>1. The Biological Inspiration</h3>
                <p>Deep Learning is inspired by the human brain's network of neurons. In a computer, an artificial neuron (or perceptron) takes multiple inputs, multiplies them by "weights," adds a "bias," and passes the result through an <strong>Activation Function</strong>.</p>
                
                <h3>2. Layers of a Network</h3>
                <p><strong>Input Layer:</strong> Receives the raw data (e.g., pixels of an image).<br>
                <strong>Hidden Layers:</strong> These are the "deep" part of Deep Learning. They extract increasingly complex features from the data.<br>
                <strong>Output Layer:</strong> Provides the final prediction (e.g., "This is a cat").</p>
                
                <h3>3. Activation Functions</h3>
                <p>These functions introduce non-linearity into the network, allowing it to learn complex patterns:
                    <ul>
                        <li><strong>ReLU (Rectified Linear Unit):</strong> <em>f(x) = max(0, x)</em>. The most popular choice for hidden layers.</li>
                        <li><strong>Sigmoid:</strong> Used for binary classification.</li>
                        <li><strong>Softmax:</strong> Used in the output layer for multi-class classification.</li>
                    </ul>
                </p>
            `
        },
        {
            title: "Transformers and the Generative AI Revolution",
            description: "Understanding the 'Attention' mechanism that powers ChatGPT.",
            html: `
                <h3>1. The Problem with RNNs</h3>
                <p>Before Transformers, we used Recurrent Neural Networks (RNNs) for language. However, RNNs process words one by one, making them slow and bad at remembering long-range dependencies in a sentence.</p>
                
                <h3>2. Attention is All You Need</h3>
                <p>The Transformer architecture, introduced in 2017, changed everything. It uses a mechanism called <strong>Self-Attention</strong>. This allows the model to look at every other word in a sentence simultaneously to understand context.</p>
                <p>For example, in the sentence "The bank was closed because of the river bank," the model uses attention to know that the first "bank" is a building and the second is land.</p>
                
                <h3>3. Large Language Models (LLMs)</h3>
                <p>GPT (Generative Pre-trained Transformer) and BERT are built on this architecture. They are trained on nearly the entire internet, allowing them to "predict the next word" with incredible accuracy, leading to the generative capabilities we see today.</p>
            `
        }
    ]
};
