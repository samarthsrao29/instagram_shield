const deepLearningTextbook = [
    {
        title: "Chapter 1: Neural Networks Intro",
        description: "From 'Neural Networks from Scratch in Python' by Harrison Kinsley",
        html: `
            <p><strong>Neural networks are really only a bunch of math equations that we, programmers, can turn into code.</strong> The thing that makes neural networks appear challenging is the math involved and how scary it can sometimes look. However, this book's purpose is to break down each of these elements into painfully simple explanations, which will cover both forward and backward passes involved in training neural networks.</p>
            <p>A typical neural network has thousands or even up to millions of adjustable <em>parameters</em> (weights and biases). In this way, neural networks act as enormous functions with vast numbers of parameters. The concept of a long function with millions of variables that could be used to solve a problem isn’t all too difficult. With that many variables related to neurons, arranged as interconnected layers, we can imagine there exist some combinations of values for these variables that will yield desired outputs.</p>
            <p>The end goal for neural networks is to adjust their weights and biases (the parameters), so when applied to a yet-unseen example in the input, they produce the desired output. This is called <strong>generalization</strong>, which means learning to fit the data instead of memorizing it (overfitting).</p>
        `
    },
    {
        title: "Chapter 2: Coding Our First Neurons",
        description: "Understanding Dot Products and Vectors",
        html: `
            <p>In the context of deep learning, we often treat <strong>tensors as arrays</strong>. An array is an ordered homologous container for numbers. A linear array, also called a 1-dimensional array, is the simplest example of an array, and in plain Python, this would be a list.</p>
            <p>One of the most important operations we’ll perform on vectors is the <strong>dot product</strong>. A dot product of two vectors is a sum of products of consecutive vector elements. Both vectors must be of the same size (have an equal number of elements).</p>
            <p>In Python, the dot product looks like this:</p>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace;">
a = [1, 2, 3]
b = [2, 3, 4]
dot_product = a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
# Result: 20
            </pre>
            <p>Using NumPy, we can perform this operation much more efficiently. We need to multiply our weights and inputs of the same index values and add the resulting values together. The dot product performs this exact type of operation.</p>
        `
    },
    {
        title: "Chapter 3: Adding Layers",
        description: "Going from one neuron to a Deep Network",
        html: `
            <p>The neural network we’ve built is becoming more respectable, but at the moment, we have only one layer. Neural networks become <strong>"deep"</strong> when they have 2 or more hidden layers.</p>
            <p>A <strong>hidden layer</strong> isn’t an input or output layer; as the scientist, you see data as they are handed to the input layer and the resulting data from the output layer. Layers between these endpoints have values that we don’t necessarily deal with, hence the name "hidden."</p>
            <p>To implement this in NumPy, we can use matrix products:</p>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace;">
import numpy as np
inputs = [[1.0, 2.0, 3.0, 2.5], [2.0, 5.0, -1.0, 2.0], [-1.5, 2.7, 3.3, -0.8]]
weights = [[0.2, 0.8, -0.5, 1.0], [0.5, -0.91, 0.26, -0.5], [-0.26, -0.27, 0.17, 0.87]]
biases = [2.0, 3.0, 0.5]

layer_outputs = np.dot(inputs, np.array(weights).T) + biases
print(layer_outputs)
            </pre>
            <p>As you can see, our neural network takes in a group of samples (inputs) and outputs a group of predictions. This is why you pass in a list of inputs and are returned a list of predictions.</p>
        `
    }
];
