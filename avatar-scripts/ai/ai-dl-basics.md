# Neural Networks & Deep Learning: Neurons, Backpropagation and the Transformer — Avatar Tutor Script

**Lesson ID:** ai-dl-basics
**Track:** AI Engineering
**Estimated runtime:** ~6 minutes (~789 words)

## Spoken script

**[HOOK — 0:00]**
For decades, the hardest part of machine learning was the features. Humans had
to hand-craft them: edge detectors for images, grammar rules for text. Deep
learning ended that. Stack enough simple units into a network, and it learns
its own features — edges and shapes in images, grammar and meaning in text. It
is what made modern vision, speech, and language models possible.

**[WHY IT MATTERS — ~0:25]**
Every model you will build on in this track is a deep network: the LLM whose
API you call, the embedding model in your RAG pipeline, the vision model in
your security camera pipeline. You do not need to derive backpropagation by
hand, but you need to know what a parameter is, what a hyperparameter is, why
everyone talks about transformers, and why GPUs are expensive. That is this
lesson.

**[SECTION — Neurons and learning — ~0:50]**
A neuron is almost embarrassingly simple. It computes a weighted sum of its
inputs, adds a bias, and then applies an activation function. Here is the key
idea: the activation adds non-linearity, and without it a deep network would
collapse into one big linear equation — no smarter than a straight line. The
common default is ReLU, which is just max of zero and x: negatives become zero,
positives pass through.

The learned weights and biases are the parameters, and model size is quoted in
parameters — 70B means seventy billion of them. Now, the thing beginners mix up:
hyperparameters are the settings you choose before training, like the learning
rate and the batch size. You tune them on the validation set, not the test set,
for the same honest-measurement reasons as last lesson.

And backpropagation? It is just the chain rule from calculus, applied
backwards: each weight's contribution to the loss is computed working from the
output back to the input, then gradient descent updates the weights.
Karpathy's micrograd implements the whole thing in about a hundred lines —
build it and feel it click.

**[SECTION — Training vocabulary — ~2:20]**
A few terms you will hear constantly. An epoch is one full pass over the
training data. A batch is the subset processed in one step — you rarely update
on the entire dataset at once. And dropout is a clever trick: during training,
random neurons get disabled, so the network cannot rely on any single path. It
is like training a team where a random player sits out each practice — everyone
learns to carry their weight. Dropout is turned off at inference time, when you
want the full team on the field.

Why GPUs? Because neural networks are, at their core, enormous numbers of
matrix operations. GPUs were built to run massive numbers of parallel
calculations for graphics, and it turns out that is exactly what training needs.
TPUs and other accelerators do the same job: matrix maths at industrial scale.

**[SECTION — Architectures — ~3:25]**
Now the family tree. Convolutional neural networks, CNNs, were the classic
architecture for images. They learn filters that detect local patterns —
edges, textures, shapes — building up from simple to complex. Vision
transformers now compete strongly, but CNNs are the ancestor you should know.

The star of the show is the Transformer, introduced in the 2017 paper
"Attention Is All You Need." Its self-attention mechanism lets every token weigh
how relevant every other token is — so when the model reads a sentence, each
word can attend to any other word for context, even far away. Crucially, it
processes sequences in parallel instead of one word at a time, which is what
made training at today's scale feasible. Nearly every modern LLM is a
Transformer under the hood.

Finally, transfer learning: start from a pretrained model and adapt it to your
task, instead of training from scratch. It needs far less data and compute, and
it is why a small team can build something useful today.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: calling everything "AI parameters." Parameters are learned
weights; hyperparameters are your settings. Mixing them up makes every
conversation about tuning confusing. Two: assuming bigger is always better.
Transfer learning from a good pretrained model usually beats training a small
model from scratch with your limited data. Three: leaving dropout on at
inference — you do not, but some pipeline bug reports trace back to exactly
this kind of train-versus-inference mismatch.

**[RECAP — ~5:10]**
A neuron is a weighted sum plus a bias plus an activation, and the activation's
non-linearity is what gives networks their power. Parameters are learned,
hyperparameters are chosen. Backpropagation is the chain rule running backwards.
An epoch is a full pass, a batch is one step, dropout fights overfitting during
training only, and GPUs win because training is parallel matrix maths. CNNs
owned images, the 2017 Transformer owns language through self-attention, and
transfer learning lets you stand on pretrained shoulders. That is deep learning
in one pass.

## On-screen visuals

- HOOK: hand-crafted features (edge detectors, grammar rules) vs learned features emerging in a network.
- WHY IT MATTERS: pipeline icons — LLM API, embedding model, vision model — all built on deep networks.
- Neurons and learning: neuron diagram — weighted sum, bias, ReLU curve; parameter vs hyperparameter comparison.
- Training vocabulary: epoch/batch animation; dropout visual with random neurons greyed out; GPU matrix-multiplication grid.
- Architectures: CNN filter detecting edges in an image; self-attention heatmap across a sentence; transfer learning as a pretrained base plus a small adaptation layer.
- RECAP: cheat-sheet terms as a clean summary card.
