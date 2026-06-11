(function () {
  const storageKey = "transitoExamProgress";
  const questions = window.EXAM_QUESTIONS || [];
  const letters = ["A", "B", "C", "D"];

  const state = {
    index: 0,
    answers: {},
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
      state.answers = saved.answers && typeof saved.answers === "object" ? saved.answers : {};
      state.completed = Boolean(saved.completed);
    } catch {
      localStorage.removeItem(storageKey);
    }
    clampIndex();
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
    updateScore();
  }

  function resetState() {
    state.index = 0;
    state.answers = {};
    state.completed = false;
    saveState();
  }

  function clampIndex() {
    state.index = Math.max(0, Math.min(state.index, questions.length - 1));
  }

  function updateScore() {
    const correct = getCorrectCount();
    els.score.textContent = correct;
    const answered = Object.keys(state.answers).length;
    const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
    els.saved.textContent = `${progress}%`;
  }

  function getCorrectCount() {
    return questions.reduce((total, question) => {
      return total + (state.answers[question.id] === question.answer ? 1 : 0);
    }, 0);
  }

  function showScreen(name) {
    [els.start, els.quiz, els.result, els.review].forEach((screen) => screen.classList.add("hidden"));
    els[name].classList.remove("hidden");
  }

  function renderQuestion() {
    clampIndex();
    const current = questions[state.index];
    const answered = state.answers[current.id];
    const progress = Math.round(((state.index + 1) / questions.length) * 100);

    els.counter.textContent = `Pregunta ${state.index + 1} de ${questions.length}`;
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

      if (answered) {
        button.disabled = true;
        if (letter === current.answer) button.classList.add("correct");
        if (letter === answered && letter !== current.answer) button.classList.add("wrong");
      }

      els.options.appendChild(button);
    });

    renderFeedback(current, answered);
    els.prevBtn.disabled = state.index === 0;
    els.nextBtn.disabled = !answered;
    els.nextBtn.textContent = state.index === questions.length - 1 ? "Ver resultado" : "Siguiente";
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
      : `Incorrecto. La respuesta correcta es ${question.answer}.`;
  }

  function selectAnswer(letter) {
    const current = questions[state.index];
    if (state.answers[current.id]) return;
    state.answers[current.id] = letter;
    saveState();
    renderQuestion();
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      if (state.index < questions.length - 1) {
        state.index += 1;
        saveState();
        renderQuestion();
      } else {
        finishExam();
      }
    }, 850);
  }

  function nextQuestion() {
    clearTimeout(autoAdvanceTimer);
    if (state.index >= questions.length - 1) {
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
    const wrong = questions.length - correct;
    const percent = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    els.finalScore.textContent = percent;
    els.finalDetail.textContent = `% (${correct} de ${questions.length} correctas)`;
    els.correctCount.textContent = correct;
    els.wrongCount.textContent = wrong;
    els.finalPercent.textContent = `${percent}%`;
  }

  function renderReview() {
    const misses = questions.filter((question) => state.answers[question.id] !== question.answer);
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
      const userAnswer = state.answers[question.id] || "Sin respuesta";
      item.innerHTML = `
        <h3>${question.id}. ${question.question}</h3>
        <p><strong>Tu respuesta:</strong> ${userAnswer}${question.options[userAnswer] ? ` - ${question.options[userAnswer]}` : ""}</p>
        <p><strong>Correcta:</strong> ${question.answer} - ${question.options[question.answer]}</p>
        <p><strong>Referencia:</strong> ${question.article} · ${question.topic}</p>
      `;
      els.reviewList.appendChild(item);
    });
  }

  function boot() {
    els.total.textContent = questions.length;
    loadState();
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
