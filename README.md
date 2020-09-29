# Question Fingerprint

This application is used to answer the following question

> How many Yes or No question would you have to ask to uniquely identify someone?. What are these questions?

The first part of this question is easy.

Say that there are 100 people in a group, and we asked a Yes/No question. The best possible scenario would be that we would have an even split of the group. 50% of the group answered yes, and 50% answered no. Continuing on that best case scenario with the remaining people. 25, 13, 6, 3, with 2 people remaining for the last question. In a best case scenario we could uniquely identify someone in a group of 100 people in 6 questions.

The second part of this question is a lot harder.

We want to choose questions that split the remaining group as close to 50% as possible. These types of questions are harder to come up with then you would guess. The first one that most people think of is 1. Are you a male?. The world population has [50.4% male, and 49.6%](https://www.worldometers.info/world-population/world-population-gender-age.php) that's a good first question. What is the next question you should ask?

To figure out what questions work best, I created this application. It allows users to add questions to the question database. Then asks users to answer these questions based on the probability that they will divide the group evenly. After each answer it recalculates the questions probability score. After you answer a few questions, the application will tell you how unique your answers have been against the rest of the so far group.

## Code quality

I am using this application to learn [Nodejs](https://nodejs.org/en/) and [Vue.js](https://vuejs.org/), and maybe some [Machine Learning](https://en.wikipedia.org/wiki/Machine_learning) (ML). It will not be the optimal solution and I may take shortcuts for readablity. Fokes and Pull requests are welcome.

## Research

- [BEST Guess Who Strategy- 96% WIN record using MATH](https://www.youtube.com/watch?v=FRlbNOno5VA)
