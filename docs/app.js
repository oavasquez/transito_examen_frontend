(function () {
  const storageKey = "transitoExamProgress";
  const questions = window.EXAM_QUESTIONS || [];
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const letters = ["A", "B", "C", "D"];

  const state = {
    index: 0,
    order: [],
    answers: {},
    mistakes: {},
    completed: false,
  };
  let autoAdvanceTimer = null;

  const els = {
    start: document.querySelector("#start-screen"),
    quiz: document.querySelector("#quiz-screen"),
    result: document.querySelector("#result-screen"),
    review: document.querySelector("#review-screen"),
    score: document.querySelector("#score-value"),
    total: document.querySelector("#total-questions"),
    saved: document.querySelector("#saved-progress"),
    continueBtn: document.querySelector("#continue-btn"),
    newBtn: document.querySelector("#new-btn"),
    counter: document.querySelector("#question-counter"),
    progressPercent: document.querySelector("#progress-percent"),
    progressBar: document.querySelector("#progress-bar"),
    block: document.querySelector("#block-label"),
    topic: document.querySelector("#topic-label"),
    article: document.querySelector("#article-label"),
    question: document.querySelector("#question-text"),
    options: document.querySelector("#options-list"),
    feedback: document.querySelector("#feedback"),
    prevBtn: document.querySelector("#prev-btn"),
    nextBtn: document.querySelector("#next-btn"),
    finalScore: document.querySelector("#final-score"),
    finalDetail: document.querySelector("#final-detail"),
    correctCount: document.querySelector("#correct-count"),
    wrongCount: document.querySelector("#wrong-count"),
    finalPercent: document.querySelector("#final-percent"),
    reviewBtn: document.querySelector("#review-btn"),
    restartBtn: document.querySelector("#restart-btn"),
    reviewList: document.querySelector("#review-list"),
    backResultBtn: document.querySelector("#back-result-btn"),
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || typeof saved !== "object") return;
      state.index = Number.isInteger(saved.index) ? saved.index : 0;
      state.order = Array.isArray(saved.order) && saved.order.length ? saved.order : makeInitialOrder();
      state.answers = saved.answers && typeof saved.answers === "object" ? saved.answers : {};
      state.mistakes = saved.mistakes && typeof saved.mistakes === "object" ? saved.mistakes : {};
      state.completed = Boolean(saved.completed);
    } catch {
      localStorage.removeItem(storageKey);
    }
    if (!state.order.length) state.order = makeInitialOrder();
    migrateOldAnswers();
    clampIndex();
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
    updateScore();
  }

  function resetState() {
    state.index = 0;
    state.order = makeInitialOrder();
    state.answers = {};
    state.mistakes = {};
    state.completed = false;
    saveState();
  }

  function clampIndex() {
    state.index = Math.max(0, Math.min(state.index, state.order.length - 1));
  }

  function makeInitialOrder() {
    return questions.map((question) => ({
      id: question.id,
      key: `q-${question.id}`,
      review: false,
    }));
  }

  function migrateOldAnswers() {
    questions.forEach((question) => {
      const oldAnswer = state.answers[question.id];
      const baseKey = `q-${question.id}`;
      if (oldAnswer && !state.answers[baseKey]) {
        state.answers[baseKey] = oldAnswer;
        delete state.answers[question.id];
      }
    });
  }

  function getCurrentItem() {
    return state.order[state.index];
  }

  function getCurrentQuestion() {
    const item = getCurrentItem();
    return item ? questionsById.get(item.id) : null;
  }

  function updateScore() {
    const correct = getCorrectCount();
    els.score.textContent = correct;
    const answered = correct;
    const progress = state.order.length ? Math.round((answered / state.order.length) * 100) : 0;
    els.saved.textContent = `${progress}%`;
  }

  function getCorrectCount() {
    return state.order.reduce((total, item) => {
      const question = questionsById.get(item.id);
      return total + (question && state.answers[item.key] === question.answer ? 1 : 0);
    }, 0);
  }

  function getMistakeCount() {
    return Object.values(state.mistakes).reduce((total, mistakes) => {
      return total + (Array.isArray(mistakes) ? mistakes.length : 0);
    }, 0);
  }

  function showScreen(name) {
    [els.start, els.quiz, els.result, els.review].forEach((screen) => screen.classList.add("hidden"));
    els[name].classList.remove("hidden");
  }

  function renderQuestion() {
    clampIndex();
    const item = getCurrentItem();
    const current = getCurrentQuestion();
    if (!item || !current) return;

    const answered = state.answers[item.key];
    const mistakes = state.mistakes[current.id] || [];
    const progress = Math.round(((state.index + 1) / state.order.length) * 100);

    els.total.textContent = state.order.length;
    els.counter.textContent = `Pregunta ${state.index + 1} de ${state.order.length}`;
    els.progressPercent.textContent = `${progress}%`;
    els.progressBar.style.width = `${progress}%`;
    els.block.textContent = current.block;
    els.topic.textContent = current.topic;
    els.article.textContent = current.article;
    els.question.textContent = current.question;
    els.options.innerHTML = "";

    letters.forEach((letter) => {
      const button = document.createElement("button");
      button.className = "option-btn";
      button.type = "button";
      button.dataset.letter = letter;
      button.innerHTML = `<span class="option-letter">${letter}</span><span>${current.options[letter]}</span>`;
      button.addEventListener("click", () => selectAnswer(letter));

      if (mistakes.includes(letter)) {
        button.classList.add("wrong");
      }

      if (answered === current.answer) {
        if (letter === current.answer) button.classList.add("correct");
        button.disabled = true;
      }

      els.options.appendChild(button);
    });

    renderFeedback(current, answered);
    els.prevBtn.disabled = state.index === 0;
    els.nextBtn.disabled = answered !== current.answer;
    els.nextBtn.textContent = state.index === state.order.length - 1 ? "Ver resultado" : "Siguiente";
    updateScore();
  }

  function renderFeedback(question, answer) {
    els.feedback.className = "feedback hidden";
    els.feedback.textContent = "";
    if (!answer) return;

    const isCorrect = answer === question.answer;
    els.feedback.classList.remove("hidden");
    els.feedback.classList.add(isCorrect ? "correct" : "wrong");
    els.feedback.textContent = isCorrect
      ? "Correcto. Sigue con la siguiente pregunta."
      : "Incorrecto. Intenta otra opcion para poder avanzar. Esta pregunta volvera a salir mas adelante.";
  }

  function selectAnswer(letter) {
    const item = getCurrentItem();
    const current = getCurrentQuestion();
    if (!item || !current || state.answers[item.key] === current.answer) return;

    if (letter !== current.answer) {
      const mistakes = state.mistakes[current.id] || [];
      if (!mistakes.includes(letter)) {
        state.mistakes[current.id] = [...mistakes, letter];
        scheduleReviewQuestion(current.id);
      }
      state.answers[item.key] = letter;
      clearTimeout(autoAdvanceTimer);
      saveState();
      renderQuestion();
      return;
    }

    state.answers[item.key] = letter;
    saveState();
    renderQuestion();
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      if (state.index < state.order.length - 1) {
        state.index += 1;
        saveState();
        renderQuestion();
      } else {
        finishExam();
      }
    }, 850);
  }

  function scheduleReviewQuestion(questionId) {
    const minOffset = 3;
    const maxOffset = 10;
    const offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
    const insertAt = Math.min(state.order.length, state.index + offset);
    state.order.splice(insertAt, 0, {
      id: questionId,
      key: `r-${questionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      review: true,
    });
  }

  function nextQuestion() {
    clearTimeout(autoAdvanceTimer);
    if (state.index >= state.order.length - 1) {
      finishExam();
      return;
    }
    state.index += 1;
    saveState();
    renderQuestion();
  }

  function prevQuestion() {
    clearTimeout(autoAdvanceTimer);
    state.index -= 1;
    saveState();
    renderQuestion();
  }

  function finishExam() {
    state.completed = true;
    saveState();
    renderResult();
    showScreen("result");
    if (window.confetti) {
      window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
    }
  }

  function renderResult() {
    const correct = getCorrectCount();
    const wrong = getMistakeCount();
    const rawScore = Math.max(0, correct - wrong);
    const percent = state.order.length ? Math.round((rawScore / state.order.length) * 100) : 0;
    els.finalScore.textContent = percent;
    els.finalDetail.textContent = `% (${rawScore} puntos netos de ${state.order.length})`;
    els.correctCount.textContent = correct;
    els.wrongCount.textContent = wrong;
    els.finalPercent.textContent = `${percent}%`;
  }

  function renderReview() {
    const misses = questions.filter((question) => (state.mistakes[question.id] || []).length);
    els.reviewList.innerHTML = "";

    if (!misses.length) {
      const empty = document.createElement("div");
      empty.className = "review-empty";
      empty.textContent = "No hay respuestas incorrectas en este intento.";
      els.reviewList.appendChild(empty);
      return;
    }

    misses.forEach((question) => {
      const item = document.createElement("article");
      item.className = "review-item";
      const userAnswers = state.mistakes[question.id].join(", ");
      item.innerHTML = `
        <h3>${question.id}. ${question.question}</h3>
        <p><strong>Intentos incorrectos:</strong> ${userAnswers}</p>
        <p><strong>Correcta:</strong> ${question.answer} - ${question.options[question.answer]}</p>
        <p><strong>Referencia:</strong> ${question.article} · ${question.topic}</p>
      `;
      els.reviewList.appendChild(item);
    });
  }

  function boot() {
    els.total.textContent = questions.length;
    loadState();
    els.total.textContent = state.order.length;
    updateScore();

    els.continueBtn.addEventListener("click", () => {
      if (state.completed) {
        renderResult();
        showScreen("result");
        return;
      }
      renderQuestion();
      showScreen("quiz");
    });

    els.newBtn.addEventListener("click", () => {
      resetState();
      renderQuestion();
      showScreen("quiz");
    });

    els.prevBtn.addEventListener("click", prevQuestion);
    els.nextBtn.addEventListener("click", nextQuestion);
    els.reviewBtn.addEventListener("click", () => {
      renderReview();
      showScreen("review");
    });
    els.restartBtn.addEventListener("click", () => {
      resetState();
      renderQuestion();
      showScreen("quiz");
    });
    els.backResultBtn.addEventListener("click", () => {
      renderResult();
      showScreen("result");
    });

    if (state.completed) {
      els.continueBtn.textContent = "Ver resultado";
    }
  }

  boot();
})();
