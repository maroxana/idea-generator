const ROLE_LIST = [
  "Future Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "DevOps Engineer",
  "Tech Manager",
  "DevOps Manager",
];

const TOPICS = [
  "AI safety",
  "Efficient AI usage",
  "Prompt quality",
  "Model limitations",
  "AI ethics",
  "Data privacy",
  "Evaluation of AI outputs",
  "Bias and hallucinations",
  "Role-specific use cases",
];

const QUESTION_BANK = [
  {
    topic: "Prompt quality",
    difficulty: "easy",
    type: "single",
    prompt: "You are {role} and need concise API docs from an LLM. Which prompt is best?",
    options: [
      { text: "Explain APIs in any way you like.", isCorrect: false },
      { text: "Summarize this API in 6 bullets: purpose, auth, endpoints, errors, limits, examples.", isCorrect: true },
      { text: "Write all details possible in one giant paragraph.", isCorrect: false },
      { text: "Tell me your thoughts about APIs.", isCorrect: false },
    ],
    explanation:
      "Good prompts define structure, scope, and constraints so output is actionable and reviewable.",
  },
  {
    topic: "Model limitations",
    difficulty: "easy",
    type: "single",
    prompt: "What is the safest assumption when an LLM returns a confident answer to a production question?",
    options: [
      { text: "Confidence means it is correct.", isCorrect: false },
      { text: "Treat it as a draft that must be verified before use.", isCorrect: true },
      { text: "Use it directly if it sounds technical.", isCorrect: false },
      { text: "Assume it is copied from official docs.", isCorrect: false },
    ],
    explanation:
      "LLMs can hallucinate. Verification against trusted sources is mandatory for production decisions.",
  },
  {
    topic: "AI ethics",
    difficulty: "medium",
    type: "multiple",
    prompt: "Your team uses AI to rank candidates. Which actions improve fairness? (Select all that apply)",
    options: [
      { text: "Audit outcomes by demographic groups and job families.", isCorrect: true },
      { text: "Include explainability notes for recruiters and candidates.", isCorrect: true },
      { text: "Hide scoring criteria to avoid scrutiny.", isCorrect: false },
      { text: "Continuously test for proxy bias in input features.", isCorrect: true },
    ],
    explanation:
      "Fairness requires monitoring, transparency, and active control of biased features and drift.",
  },
  {
    topic: "Data privacy",
    difficulty: "medium",
    type: "multiple",
    prompt: "Before sending logs to an AI assistant, what should {role} do? (Select all that apply)",
    options: [
      { text: "Redact PII and secrets from prompts and attachments.", isCorrect: true },
      { text: "Classify data and confirm policy allows external processing.", isCorrect: true },
      { text: "Share production tokens to improve troubleshooting speed.", isCorrect: false },
      { text: "Use least-privilege temporary datasets when possible.", isCorrect: true },
    ],
    explanation:
      "Protecting sensitive data requires minimization, classification, and secure handling workflows.",
  },
  {
    topic: "Evaluation of AI outputs",
    difficulty: "medium",
    type: "single",
    prompt: "Which metric best checks whether generated test cases from an LLM are useful?",
    options: [
      { text: "Output length in tokens.", isCorrect: false },
      { text: "Pass rate against known bug-finding scenarios and coverage goals.", isCorrect: true },
      { text: "How quickly the model responds.", isCorrect: false },
      { text: "How formal the text sounds.", isCorrect: false },
    ],
    explanation:
      "Evaluation should map to business or engineering outcomes, not superficial output qualities.",
  },
  {
    topic: "Bias and hallucinations",
    difficulty: "medium",
    type: "multiple",
    prompt: "You suspect hallucinations in AI-generated release notes. What is a good response? (Select all that apply)",
    options: [
      { text: "Cross-check claims with commit history and issue tracker.", isCorrect: true },
      { text: "Add retrieval from authoritative internal sources.", isCorrect: true },
      { text: "Increase temperature and trust consensus wording.", isCorrect: false },
      { text: "Require confidence tags plus human review before publish.", isCorrect: true },
    ],
    explanation:
      "Grounding and verification pipelines reduce hallucination risk in operational content.",
  },
  {
    topic: "AI safety",
    difficulty: "hard",
    type: "single",
    prompt: "A model occasionally outputs unsafe instructions. What should be prioritized first?",
    options: [
      { text: "Ship quickly and monitor social media feedback.", isCorrect: false },
      { text: "Define policy tests and block unsafe outputs with layered guardrails.", isCorrect: true },
      { text: "Ask users to ignore unsafe messages.", isCorrect: false },
      { text: "Reduce documentation so fewer users see failures.", isCorrect: false },
    ],
    explanation:
      "Production safety needs explicit policy tests and robust prevention controls.",
  },
  {
    topic: "Efficient AI usage",
    difficulty: "easy",
    type: "single",
    prompt: "How can {role} reduce LLM cost while keeping quality acceptable?",
    options: [
      { text: "Always use the largest model for every task.", isCorrect: false },
      { text: "Route simple tasks to smaller models and cache repeated prompts.", isCorrect: true },
      { text: "Disable all validation checks.", isCorrect: false },
      { text: "Request longer outputs than needed.", isCorrect: false },
    ],
    explanation:
      "Model routing and caching usually provide major savings without lowering core quality targets.",
  },
  {
    topic: "Role-specific use cases",
    difficulty: "medium",
    type: "single",
    prompt: "For {role}, which use of AI best improves day-to-day impact for a junior hire?",
    options: [
      { text: "Auto-drafting plans with human approval and traceability.", isCorrect: true },
      { text: "Replacing all reviews and approvals automatically.", isCorrect: false },
      { text: "Ignoring stakeholders while iterating prompts.", isCorrect: false },
      { text: "Publishing outputs without context.", isCorrect: false },
    ],
    explanation:
      "High-value junior workflows pair AI acceleration with review and accountability.",
  },
  {
    topic: "Data privacy",
    difficulty: "hard",
    type: "multiple",
    prompt: "Which controls are strongest for enterprise AI prompt logging? (Select all that apply)",
    options: [
      { text: "Encrypt logs at rest and in transit.", isCorrect: true },
      { text: "Apply retention limits and automatic deletion.", isCorrect: true },
      { text: "Store plaintext secrets for reproducibility.", isCorrect: false },
      { text: "Restrict access through role-based permissions.", isCorrect: true },
    ],
    explanation:
      "Security and privacy controls must include encryption, access boundaries, and retention policies.",
  },
  {
    topic: "Prompt quality",
    difficulty: "hard",
    type: "multiple",
    prompt: "You need reliable JSON output for tooling. Which prompt tactics help? (Select all that apply)",
    options: [
      { text: "Provide a strict schema and example output.", isCorrect: true },
      { text: "Specify required fields and allowed values.", isCorrect: true },
      { text: "Ask for creativity without constraints.", isCorrect: false },
      { text: "Request plain prose only.", isCorrect: false },
    ],
    explanation:
      "Constrained prompting and explicit schemas improve machine-parseable consistency.",
  },
  {
    topic: "Evaluation of AI outputs",
    difficulty: "hard",
    type: "single",
    prompt: "Which evaluation strategy is best before releasing an AI feature to all users?",
    options: [
      { text: "Only test with the team that built it.", isCorrect: false },
      { text: "Run offline benchmarks plus a staged rollout with monitoring and rollback criteria.", isCorrect: true },
      { text: "Use one perfect demo as proof of readiness.", isCorrect: false },
      { text: "Skip monitoring if unit tests pass.", isCorrect: false },
    ],
    explanation:
      "A safe release combines controlled testing, live observation, and rollback readiness.",
  },
  {
    topic: "Model limitations",
    difficulty: "medium",
    type: "multiple",
    prompt: "What are realistic limitations of LLMs that {role} should account for? (Select all that apply)",
    options: [
      { text: "They can produce plausible but false claims.", isCorrect: true },
      { text: "They may be sensitive to small prompt wording changes.", isCorrect: true },
      { text: "They always provide deterministic outputs.", isCorrect: false },
      { text: "They can reflect biases from training data.", isCorrect: true },
    ],
    explanation:
      "Robust systems account for non-determinism, hallucinations, and inherited data bias.",
  },
  {
    topic: "AI safety",
    difficulty: "easy",
    type: "single",
    prompt: "A user asks your chatbot for dangerous guidance. What should happen?",
    options: [
      { text: "Comply as long as the request is detailed.", isCorrect: false },
      { text: "Decline harmful content and provide safe alternatives or resources.", isCorrect: true },
      { text: "Return an empty response with no explanation.", isCorrect: false },
      { text: "Forward the prompt to all users.", isCorrect: false },
    ],
    explanation:
      "Safety policy should block harmful content and steer users toward safe outcomes.",
  },
  {
    topic: "AI ethics",
    difficulty: "medium",
    type: "single",
    prompt: "Which statement best reflects responsible AI decision ownership?",
    options: [
      { text: "The model owns final accountability.", isCorrect: false },
      { text: "Human teams remain accountable for decisions supported by AI.", isCorrect: true },
      { text: "Vendors are solely responsible after deployment.", isCorrect: false },
      { text: "No one is accountable when confidence is high.", isCorrect: false },
    ],
    explanation:
      "AI assists decisions, but legal and ethical accountability stays with people and organizations.",
  },
];

const DIFFICULTY_WEIGHTS = {
  easy: 2,
  medium: 3,
  hard: 4,
};

const state = {
  test: null,
  currentIndex: 0,
  answers: {},
  submitted: false,
};

const setupPanel = document.getElementById("setupPanel");
const testPanel = document.getElementById("testPanel");
const resultsPanel = document.getElementById("resultsPanel");

const roleTypeEl = document.getElementById("roleType");
const setupMessageEl = document.getElementById("setupMessage");
const testMessageEl = document.getElementById("testMessage");

const testTitleEl = document.getElementById("testTitle");
const questionHeadingEl = document.getElementById("questionHeading");
const progressLabelEl = document.getElementById("progressLabel");
const progressMetaEl = document.getElementById("progressMeta");
const progressBarEl = document.getElementById("progressBar");
const progressTrackEl = document.querySelector(".progress-track");

const questionTypeBadgeEl = document.getElementById("questionTypeBadge");
const difficultyBadgeEl = document.getElementById("difficultyBadge");
const topicBadgeEl = document.getElementById("topicBadge");
const questionPromptEl = document.getElementById("questionPrompt");
const optionsFormEl = document.getElementById("optionsForm");

const scorePercentEl = document.getElementById("scorePercent");
const scorePointsEl = document.getElementById("scorePoints");
const scoreCorrectCountEl = document.getElementById("scoreCorrectCount");
const resultsListEl = document.getElementById("resultsList");

const generateBtn = document.getElementById("generateBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const restartBtn = document.getElementById("restartBtn");

class MockAIQuestionAgent {
  async generateTest({ roleType, count }) {
    if (!ROLE_LIST.includes(roleType)) {
      throw new Error("Unsupported role type selected.");
    }

    const shuffled = shuffle([...QUESTION_BANK]);
    const selected = [];
    const usedPrompt = new Set();

    for (const item of shuffled) {
      if (selected.length >= count) break;
      const prompt = item.prompt.replaceAll("{role}", roleType);
      const key = `${item.topic}:${prompt}`;
      if (usedPrompt.has(key)) continue;
      usedPrompt.add(key);

      const options = item.options.map((option, index) => {
        const base = DIFFICULTY_WEIGHTS[item.difficulty] || 2;
        const correctCount = item.options.filter((o) => o.isCorrect).length;
        const score = option.isCorrect
          ? Math.max(1, item.type === "multiple" ? Math.round(base / correctCount) : base)
          : 0;
        return {
          id: `${Math.random().toString(36).slice(2, 8)}_${index + 1}`,
          text: option.text,
          isCorrect: option.isCorrect,
          score,
        };
      });

      selected.push({
        id: `q_${selected.length + 1}`,
        prompt,
        type: item.type,
        topic: item.topic,
        difficulty: item.difficulty,
        explanation: item.explanation,
        options,
      });
    }

    if (selected.length < count) {
      throw new Error("AI agent could not generate enough questions. Please try again.");
    }

    return {
      title: `AI Interview Test for ${roleType}`,
      roleType,
      questions: selected,
      generatedAt: new Date().toISOString(),
    };
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getSelectedQuestionCount() {
  const selected = document.querySelector('input[name="questionCount"]:checked');
  return Number(selected?.value || 15);
}

async function onGenerateTest() {
  const roleType = roleTypeEl.value;
  const count = getSelectedQuestionCount();

  setupMessageEl.textContent = "Generating role-aware questions with AI agent...";
  generateBtn.disabled = true;

  try {
    const agent = new MockAIQuestionAgent();
    const test = await agent.generateTest({ roleType, count });

    state.test = test;
    state.currentIndex = 0;
    state.answers = {};
    state.submitted = false;

    setupPanel.classList.add("hidden");
    resultsPanel.classList.add("hidden");
    testPanel.classList.remove("hidden");

    setupMessageEl.textContent = "";
    testMessageEl.textContent = "";
    renderQuestion();
  } catch (error) {
    setupMessageEl.textContent = error.message;
  } finally {
    generateBtn.disabled = false;
  }
}

function renderQuestion() {
  const question = state.test.questions[state.currentIndex];
  const total = state.test.questions.length;
  const answered = Object.keys(state.answers).length;

  testTitleEl.textContent = `${state.test.title} (${state.test.roleType})`;
  questionHeadingEl.textContent = `Question ${state.currentIndex + 1}`;
  progressLabelEl.textContent = `${state.currentIndex + 1} / ${total}`;
  progressMetaEl.textContent = `${answered} answered`;

  const progressPercent = Math.round(((state.currentIndex + 1) / total) * 100);
  progressBarEl.style.width = `${progressPercent}%`;
  progressTrackEl.setAttribute("aria-valuenow", String(progressPercent));

  questionTypeBadgeEl.textContent = question.type === "single" ? "Single Choice" : "Multiple Choice";
  difficultyBadgeEl.textContent = `${question.difficulty[0].toUpperCase()}${question.difficulty.slice(1)} level`;
  topicBadgeEl.textContent = question.topic;
  questionPromptEl.textContent = question.prompt;

  optionsFormEl.innerHTML = "";

  const selectedSet = new Set(state.answers[question.id] || []);
  question.options.forEach((option) => {
    const id = `${question.id}_${option.id}`;
    const wrapper = document.createElement("label");
    wrapper.className = "option";

    const input = document.createElement("input");
    input.type = question.type === "single" ? "radio" : "checkbox";
    input.name = question.id;
    input.value = option.id;
    input.id = id;
    input.checked = selectedSet.has(option.id);

    input.addEventListener("change", () => {
      if (question.type === "single") {
        state.answers[question.id] = [option.id];
      } else {
        const current = new Set(state.answers[question.id] || []);
        if (input.checked) current.add(option.id);
        else current.delete(option.id);
        state.answers[question.id] = [...current];
      }
      updateTestMessage();
      const answeredNow = Object.keys(state.answers).filter((key) => (state.answers[key] || []).length > 0).length;
      progressMetaEl.textContent = `${answeredNow} answered`;
    });

    const content = document.createElement("span");
    const text = document.createElement("span");
    text.className = "option-label";
    text.textContent = option.text;

    content.append(text);
    wrapper.append(input, content);
    optionsFormEl.appendChild(wrapper);
  });

  prevBtn.disabled = state.currentIndex === 0;
  nextBtn.disabled = state.currentIndex === total - 1;
  submitBtn.disabled = false;
}

function updateTestMessage() {
  const unanswered = getUnansweredQuestions();
  if (unanswered.length === 0) {
    testMessageEl.textContent = "All questions answered. You can submit now.";
  } else {
    testMessageEl.textContent = `${unanswered.length} question(s) still unanswered.`;
  }
}

function getUnansweredQuestions() {
  return state.test.questions
    .filter((q) => !(state.answers[q.id] && state.answers[q.id].length > 0))
    .map((q, idx) => ({ number: idx + 1, id: q.id }));
}

function navigate(offset) {
  const next = state.currentIndex + offset;
  if (next < 0 || next >= state.test.questions.length) return;
  state.currentIndex = next;
  renderQuestion();
}

function calculateResults() {
  let earned = 0;
  let total = 0;
  let correctSelections = 0;

  const byQuestion = state.test.questions.map((question, idx) => {
    const selected = new Set(state.answers[question.id] || []);
    const correctOptions = question.options.filter((o) => o.isCorrect);
    const wrongSelected = question.options.filter((o) => selected.has(o.id) && !o.isCorrect);
    const selectedCorrect = correctOptions.filter((o) => selected.has(o.id));

    const questionMax = correctOptions.reduce((sum, option) => sum + option.score, 0);
    const questionEarned = selectedCorrect.reduce((sum, option) => sum + option.score, 0);

    total += questionMax;
    earned += questionEarned;
    correctSelections += selectedCorrect.length;

    return {
      id: question.id,
      number: idx + 1,
      prompt: question.prompt,
      type: question.type,
      topic: question.topic,
      explanation: question.explanation,
      correctOptions,
      selectedOptions: question.options.filter((o) => selected.has(o.id)),
      wrongSelected,
      selectedCorrect,
      questionMax,
      questionEarned,
    };
  });

  const percent = total > 0 ? Math.round((earned / total) * 100) : 0;

  return {
    earned,
    total,
    percent,
    correctSelections,
    byQuestion,
  };
}

function renderResults() {
  const results = calculateResults();

  scorePercentEl.textContent = `${results.percent}%`;
  scorePointsEl.textContent = `${results.earned} / ${results.total}`;
  scoreCorrectCountEl.textContent = String(results.correctSelections);

  resultsListEl.innerHTML = "";
  results.byQuestion.forEach((item) => {
    const isFullyCorrect = item.wrongSelected.length === 0 && item.questionEarned === item.questionMax;

    const card = document.createElement("article");
    card.className = `result-item ${isFullyCorrect ? "correct" : "incorrect"}`;

    const title = document.createElement("h4");
    title.textContent = `Q${item.number}. ${item.prompt}`;

    const score = document.createElement("p");
    score.className = "result-meta";
    score.innerHTML = `<strong>Score:</strong> ${item.questionEarned} / ${item.questionMax}`;

    const selected = document.createElement("p");
    selected.className = "result-meta";
    selected.innerHTML = `<strong>Your answer(s):</strong> ${item.selectedOptions.length ? item.selectedOptions.map((o) => o.text).join("; ") : "No answer"}`;

    const correct = document.createElement("p");
    correct.className = "result-meta";
    correct.innerHTML = `<strong>Correct answer(s):</strong> ${item.correctOptions.map((o) => o.text).join("; ")}`;

    const wrong = document.createElement("p");
    wrong.className = "result-meta";
    wrong.innerHTML = `<strong>Wrong selected:</strong> ${item.wrongSelected.length ? item.wrongSelected.map((o) => o.text).join("; ") : "None"}`;

    const explanation = document.createElement("p");
    explanation.className = "result-explain";
    explanation.textContent = `Explanation: ${item.explanation}`;

    card.append(title, score, selected, correct, wrong, explanation);
    resultsListEl.appendChild(card);
  });

  testPanel.classList.add("hidden");
  resultsPanel.classList.remove("hidden");
}

function submitTest() {
  const unanswered = getUnansweredQuestions();
  if (unanswered.length > 0) {
    testMessageEl.textContent = `Please answer all questions before submitting. Missing: ${unanswered.map((q) => q.number).join(", ")}`;
    return;
  }

  state.submitted = true;
  renderResults();
}

function resetApp() {
  state.test = null;
  state.currentIndex = 0;
  state.answers = {};
  state.submitted = false;

  testPanel.classList.add("hidden");
  resultsPanel.classList.add("hidden");
  setupPanel.classList.remove("hidden");

  setupMessageEl.textContent = "";
  testMessageEl.textContent = "";
}

generateBtn.addEventListener("click", onGenerateTest);
prevBtn.addEventListener("click", () => navigate(-1));
nextBtn.addEventListener("click", () => navigate(1));
submitBtn.addEventListener("click", submitTest);
restartBtn.addEventListener("click", resetApp);

setupMessageEl.textContent = "Select a role and generate your first assessment.";
