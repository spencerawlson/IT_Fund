# Machine Learning Basics: Training, Overfitting and Metrics — Avatar Tutor Script

**Lesson ID:** ai-ml-basics
**Track:** AI Engineering
**Estimated runtime:** ~5 minutes (~756 words)

## Spoken script

**[HOOK — 0:00]**
Nobody wrote the rules for your spam filter. Nobody sat down and listed every
trick a phisher uses. Instead, someone fed a model millions of labelled emails,
and the model figured out the pattern itself. That is machine learning:
programs built from examples instead of hand-written rules. Learn how they are
trained and measured, and you will know when to trust them — and when to push
back.

**[WHY IT MATTERS — ~0:25]**
Here is why this lesson matters more than it looks. As a security practitioner
you will live inside ML systems: fraud scores, malware classifiers, vendor
demos boasting about 99 percent accuracy. Understand training, overfitting,
precision and recall, and you can call bluff on the demo and tune the detector
yourself. This is the vocabulary for the whole track.

**[SECTION — Three ways to learn — ~0:50]**
There are three ways a model learns, and the difference is the labels.
Supervised learning uses labelled examples, inputs with known answers.
Predicting a house price is regression, because the answer is a number.
Predicting spam or not spam is classification, because the answer is a
category. In both cases, the feature is an input variable the model uses, and
the label is the output you want to predict. Think of features as clues and the
label as the answer.

Unsupervised learning finds structure without labels — like k-means clustering
customers into groups nobody named first. Reinforcement learning learns by
trial and reward, the way you learn a video game by playing it. And RLHF,
reinforcement learning from human feedback, aligns language models with human
preferences: people rank the answers, and the model learns which ones humans
prefer.

**[SECTION — How training works — ~1:55]**
So how does the model actually learn? A loss function measures how wrong the
model's predictions are, and training is the process of minimising that loss.
The workhorse is gradient descent: it adjusts the model's parameters step by
step, always moving in the direction that reduces the loss. Picture standing on
a mountainside in thick fog, trying to reach the valley. You feel the slope
under your feet and take one step downhill. Then another. That is gradient
descent.

The learning rate sets the step size, and this is what bites beginners first.
Too large, and you leap over the valley and diverge. Too small, and training
crawls for days. Now you know what that dial controls.

**[SECTION — Generalisation — ~2:55]**
A model that aces training data and fails in the real world is useless, and that
failure has a name: overfitting. The model memorised the training data instead
of learning the pattern — high accuracy on the training set, low accuracy on
validation. It is like a student who memorised last year's exam answers but
understands nothing. The opposite failure is underfitting: a model too simple to
capture the pattern, scoring poorly on everything.

The discipline that keeps you honest: split data into three sets. Train on the
first, tune choices on the validation set, and measure true generalisation
exactly once on the test set. Never tune on the test set — the moment you do,
its score is no longer honest.

**[SECTION — Measuring what matters — ~3:55]**
Now the part that decides whether your malware detector is actually useful: the
metrics. Accuracy is the obvious one, and it lies. If one percent of
transactions are fraud, a model that always says "not fraud" is 99 percent
accurate and completely useless. On imbalanced data, and security data is nearly
always imbalanced, accuracy misleads.

So we use precision and recall. Precision means few false alarms: of everything
flagged, how much was really malicious? Recall means few missed threats: of all
the malware out there, how much did it catch? Like a smoke alarm — sensitive
catches every fire but screams at toast. The trade-off is set by the decision
threshold, and F1 balances the two.

**[COMMON MISTAKES — ~5:00]**
Three traps. One: the vendor bragging about 99 percent accuracy — ask for the
base rate and the precision-recall numbers first. Two: tuning on the test set.
It feels productive but corrupts your only honest measurement. Three: mixing up
precision and recall. Precision is false alarms, recall is missed threats. Ask
which failure costs more: quarantining a good file, or missing a bad one?

**[RECAP — ~5:30]**
Three ways to learn: supervised with labels — regression for numbers,
classification for categories; unsupervised for structure without labels;
reinforcement through trial and reward. Training minimises loss with gradient
descent, and the learning rate sets the step size. Watch for overfitting —
great on training, poor on validation — and keep the test set untouched. On
imbalanced data, judge by precision and recall, never accuracy alone. That is
the foundation of machine learning.

## On-screen visuals

- HOOK: spam inbox with a filter catching a phishing email; labels "rules" vs "examples" fading in.
- WHY IT MATTERS: three icons — fraud score, malware quarantine, vendor demo accuracy claim.
- Three ways to learn: three panels — labelled examples flowing into regression/classification, k-means clusters forming, reward-based trial loop.
- How training works: loss curve descending; learning-rate animation showing divergence vs crawl vs convergence.
- Generalisation: train/validation/test split diagram; memorisation vs understanding comparison.
- Measuring what matters: fraud base-rate example (99 percent accurate, useless); precision/recall smoke-alarm analogy graphic.
- RECAP: cheat-sheet terms as a clean summary card.
