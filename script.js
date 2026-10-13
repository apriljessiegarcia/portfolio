// Initialize Lucide Icons
lucide.createIcons();
const modal = document.getElementById('projectModal');
const modalContent = document.getElementById('modalContent');

// Function to Open Certificate Modal
function openCertModal(certId) {
  const data = certificatesData[certId];
  if (!data) return;

  const skillsHTML = data.skills.map(s => `
    <span class="bg-yellow-300 text-purple-950 border border-purple-950 font-bold text-xs px-2.5 py-1 rounded-lg">
      ${s}
    </span>
  `).join('');

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-start gap-2 pr-8">
        <div>
          <h2 class="font-serif text-2xl md:text-3xl font-bold text-purple-950">${data.title}</h2>
          <p class="text-xs text-purple-800 font-medium">Issuer: ${data.issuer}</p>
        </div>
        <span class="bg-yellow-300 border border-purple-950 text-purple-950 text-xs font-bold px-3 py-1 rounded-full shrink-0">
          ${data.date}
        </span>
      </div>

      <div class="border-2 border-purple-950 rounded-2xl overflow-hidden shadow-md bg-white">
        <img src="${data.image}" alt="${data.title}" class="w-full h-48 md:h-56 object-cover">
      </div>

      <p class="text-xs md:text-sm text-slate-700 leading-relaxed border-t border-purple-200 pt-3">
        ${data.description}
      </p>

      <div>
        <h4 class="text-xs font-bold uppercase text-purple-950 mb-2">Validated Skills & Concepts:</h4>
        <div class="flex flex-wrap gap-2">
          ${skillsHTML}
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

// Function to Open Project Modal
function openProjectModal(projectId) {
  const data = projectsData[projectId];
  if (!data) return;

  const imagesHTML = data.images.map(img => `
    <div class="bg-white p-2 rounded-xl border-2 border-purple-950 shadow-sm">
      <img src="${img.src}" alt="${img.label}" class="w-full h-32 object-cover rounded-lg">
      <p class="text-[11px] font-bold text-purple-950 mt-2 text-center">${img.label}</p>
    </div>
  `).join('');

  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-start gap-2 pr-8">
        <div>
          <h2 class="font-serif text-2xl md:text-3xl font-bold text-purple-950">${data.title}</h2>
          <p class="text-xs text-purple-800 font-medium">Lead Agency: ${data.agency}</p>
        </div>
        <span class="bg-yellow-300 border border-purple-950 text-purple-950 text-xs font-bold px-3 py-1 rounded-full shrink-0">
          ${data.period}
        </span>
      </div>

      <p class="text-xs md:text-sm text-slate-700 leading-relaxed border-t border-purple-200 pt-3">
        ${data.description}
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        ${imagesHTML}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

// Function to Close Modal
function closeProjectModal() {
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

// Close modal when clicking outside content area
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeProjectModal();
    }
  });
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (modal && e.key === 'Escape' && !modal.classList.contains('hidden')) {
    closeProjectModal();
  }
});

// Gemini Flash portfolio chatbot
(() => {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const submit = document.getElementById('chatSubmit');
  const messagesEl = document.getElementById('chatMessages');
  const statusEl = document.getElementById('chatStatus');
  if (!form || !input || !submit || !messagesEl) return;

  const conversation = [];

  function addMessage(role, text) {
    const message = document.createElement('div');
    message.className = `chat-message ${role === 'user' ? 'chat-message-user' : 'chat-message-ai'}`;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? 'You' : "April's assistant";
    const content = document.createElement('span');
    content.textContent = text;
    message.append(label, content);
    messagesEl.appendChild(message);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function askAssistant(question) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || submit.disabled) return;

    conversation.push({ role: 'user', text: cleanQuestion });
    addMessage('user', cleanQuestion);
    input.value = '';
    submit.disabled = true;
    input.disabled = true;
    statusEl.textContent = 'Thinking...';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Something went wrong.');

      conversation.push({ role: 'model', text: data.reply });
      addMessage('model', data.reply);
      statusEl.textContent = '';
    } catch (error) {
      conversation.pop();
      addMessage('model', error.message || 'Unable to connect right now. Please try again.');
      statusEl.textContent = 'Check your Vercel API configuration and try again.';
    } finally {
      submit.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    askAssistant(input.value);
  });

  document.querySelectorAll('.chat-suggestion').forEach((button) => {
    button.addEventListener('click', () => askAssistant(button.dataset.question || ''));
  });
})();
