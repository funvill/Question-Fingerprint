// main.js for Question Fingerprint
function getSessionId() {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    fetch('/api/session', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        sessionId = data.sessionId;
        localStorage.setItem('sessionId', sessionId);
        loadNextQuestion();
      });
    return null;
  }
  return sessionId;
}

const questionSection = document.getElementById('question-section');
const noQuestionsSection = document.getElementById('no-questions-section');
const questionText = document.getElementById('question-text');
const optionAButton = document.getElementById('optionA');
const optionBButton = document.getElementById('optionB');
const skipButton = document.getElementById('skip-question');
const addQuestionForm = document.getElementById('add-question-form');
const formMessage = document.getElementById('form-message');
const questionIdSpan = document.getElementById('question-id');
const flagButton = document.getElementById('flag-question');
const questionStatsLink = document.getElementById('question-stats-link');
const footerSessionLink = document.getElementById('footer-session-link');
const footerSessionId = document.getElementById('footer-session-id');
const footerAnsweredCount = document.getElementById('footer-answered-count');

let currentQuestionId = null;
let answeredCount = 0;

function loadNextQuestion() {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) return;
  fetch(`/api/questions/next?sessionId=${sessionId}`)
    .then(res => {
      if (res.status === 404) {
        questionSection.style.display = 'none';
        noQuestionsSection.style.display = 'block';
        return null;
      }
      return res.json();
    })
    .then(data => {
      if (!data) return;
      currentQuestionId = data.questionId;
      questionIdSpan.textContent = `#${data.questionId}`;
      questionText.textContent = data.text;
      optionAButton.textContent = data.optionA;
      optionBButton.textContent = data.optionB;
      questionSection.style.display = 'block';
      noQuestionsSection.style.display = 'none';
    });
  updateFooter();
}

flagButton.onclick = function(e) {
  e.preventDefault();
  const sessionId = localStorage.getItem('sessionId');
  if (!currentQuestionId || !sessionId) return;
  fetch('/api/questions/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: currentQuestionId, sessionId })
  })
    .then(res => res.json())
    .then(() => {
      alert('Thank you for flagging this question. Moderators will review it.');
    });
};

questionStatsLink.onclick = function(e) {
  e.preventDefault();
  if (!currentQuestionId) return;
  window.location.href = `/question-stats.html?questionId=${currentQuestionId}`;
};

footerSessionLink.onclick = function(e) {
  e.preventDefault();
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) return;
  window.location.href = `/session-stats.html?sessionId=${sessionId}`;
};

skipButton.onclick = function() {
  loadNextQuestion();
};

function updateFooter() {
  const sessionId = localStorage.getItem('sessionId') || '';
  footerSessionId.textContent = sessionId;
  if (!sessionId) return;
  fetch(`/api/info?sessionId=${sessionId}`)
    .then(res => res.json())
    .then(data => {
      footerAnsweredCount.textContent = data.questionCount || 0;
    });
}

optionAButton.onclick = () => submitAnswer('A');
optionBButton.onclick = () => submitAnswer('B');
function submitAnswer(answer) {
  const sessionId = localStorage.getItem('sessionId');
  if (!currentQuestionId || !sessionId) return;
  optionAButton.disabled = true;
  optionBButton.disabled = true;
  fetch('/api/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: currentQuestionId, answer, sessionId })
  })
    .then(res => res.json())
    .then(() => {
      optionAButton.disabled = false;
      optionBButton.disabled = false;
      loadNextQuestion();
    });
}

addQuestionForm.onsubmit = function(e) {
  e.preventDefault();
  const sessionId = localStorage.getItem('sessionId');
  const text = document.getElementById('question').value.trim();
  const optionA = document.getElementById('optionAInput').value.trim();
  const optionB = document.getElementById('optionBInput').value.trim();
  formMessage.textContent = '';
  fetch('/api/questions/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, optionA, optionB, sessionId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        formMessage.textContent = data.error;
      } else {
        formMessage.textContent = 'Question submitted!';
        addQuestionForm.reset();
        loadNextQuestion();
      }
    });
};

window.onload = function() {
  const sessionId = getSessionId();
  if (sessionId) loadNextQuestion();
  updateFooter();
};
