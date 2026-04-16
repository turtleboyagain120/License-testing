class LicenseGenerator {
  constructor() {
    this.currentQuestion = 0;
    this.answers = {};
    this.questions = [];
    this.init();
  }

  async init() {
    // Load questions
    try {
      const res = await fetch('/questions.json');
      this.questions = await res.json();
    } catch (e) {
      console.error('Load questions failed:', e);
      return;
    }

    this.renderQuestion(0);
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('generate-btn').addEventListener('click', () => this.generate());
  }

  renderQuestion(idx) {
    if (idx >= this.questions.length) {
      document.getElementById('generate-btn').disabled = false;
      return;
    }

    const q = this.questions[idx];
    const container = document.getElementById('questions-container');
    container.innerHTML = `
      <div class="question">
        <label>${q.text}</label>
        ${q.type === 'multiple' ? 
          q.options.map(opt => `<label><input type="radio" name="q${idx}" value="${opt}"> ${opt}</label>`).join('') :
          `<input type="${q.type}" id="q${idx}" name="q${idx}">`
        }
        <div style="margin-top: 1rem;">
          <button onclick="generator.prevQuestion()">Previous</button>
          <button onclick="generator.nextQuestion()">Next</button>
        </div>
      </div>
    `;

    // Progress
    const progress = (idx / this.questions.length) * 100;
    document.getElementById('progress').style.width = progress + '%';

    this.currentQuestion = idx;
  }

  nextQuestion() {
    const input = document.querySelector(`#questions-container input[name="q${this.currentQuestion}"]:checked`) || 
                  document.querySelector(`#questions-container input[name="q${this.currentQuestion}"]`);
    if (!input || !input.value) return alert('Please answer the question');

    this.answers[this.questions[this.currentQuestion].id] = input.value;
    this.renderQuestion(this.currentQuestion + 1);
  }

  prevQuestion() {
    if (this.currentQuestion > 0) {
      this.renderQuestion(this.currentQuestion - 1);
    }
  }

  async generate() {
    document.getElementById('questionnaire').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');

    try {
      const res = await fetch('/generate_license', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(this.answers)
      });
      const data = await res.json();

      document.getElementById('loading').classList.add('hidden');
      document.getElementById('result').classList.remove('hidden');

      document.getElementById('confidence').innerHTML = 
        `<strong>Selected: ${data.selected}</strong><br>Confidence: ${data.confidence}<br>Reasons: ${data.reasons.join(', ') || 'General match'}`;
      document.getElementById('license-content').value = data.content;

      document.getElementById('download-btn').onclick = () => this.download(data.content);
    } catch (e) {
      alert('Generation failed: ' + e.message);
      document.getElementById('questionnaire').classList.remove('hidden');
    }
  }

  download(content) {
    const blob = new Blob([content], {type: 'text/markdown'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LICENSE.md';
    a.click();
    URL.revokeObjectURL(url);
  }
}

const generator = new LicenseGenerator();

