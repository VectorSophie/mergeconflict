import { createChatGate, formatNumber, getSwipeDirection, resolveSwipe } from './appLogic.mjs';
import { developerPersonality, repos } from './data.mjs';

const state = {
  screen: 'landing',
  currentIndex: 0,
  swiped: [],
  interested: [],
  matches: [],
  activeMatch: null,
  detailRepo: null,
  chatRepo: null,
  chatUsage: 0,
  isPaid: false,
  messages: []
};

const app = document.querySelector('#app');

function setState(patch) {
  const previousScreen = state.screen;
  Object.assign(state, patch);
  render();
  if (patch.screen && patch.screen !== previousScreen) {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function template(strings, ...values) {
  return strings.reduce((out, item, index) => out + item + (values[index] ?? ''), '');
}

function tagList(items) {
  return items.map((item) => `<span class="tag">${item}</span>`).join('');
}

function stat(label, value) {
  return `<span><b>${value}</b>${label}</span>`;
}

function repoInitials(repo) {
  return repo.name
    .split(/[-_/]/)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

function renderShell(content) {
  app.innerHTML = template`
    <div class="ambient">
      <span></span><span></span><span></span>
    </div>
    <div class="grid-bg"></div>
    ${content}
    ${state.detailRepo ? renderDetailModal(state.detailRepo) : ''}
    ${state.screen === 'pricing' ? renderPricing(true) : ''}
  `;
  bindEvents();
}

function render() {
  const screens = {
    landing: renderLanding,
    loading: renderLoading,
    personality: renderPersonality,
    swipe: renderSwipe,
    match: renderMatch,
    chat: renderChat,
    pricing: () => renderSwipe()
  };
  renderShell(screens[state.screen]());
}

function renderLanding() {
  return template`
    <main class="landing page">
      <section class="hero-panel">
        <div class="hero-copy">
          <p class="eyebrow">mergeconflict</p>
          <h1>Find the repository you were meant to commit to.</h1>
          <p class="lede">Swipe through open source projects, match with codebases that fit your developer personality, and chat with the repo before your first pull request.</p>
          <div class="actions">
            <button class="neon primary" data-action="start">Login with GitHub</button>
            <button class="neon ghost" data-action="start">Explore Demo</button>
          </div>
          <p class="micro">Your next open source dependency might be emotionally available.</p>
        </div>
        <div class="graph-card" aria-label="Animated repository graph">
          ${repos.slice(0, 7).map((repo, index) => `<button class="repo-node n${index}" data-action="start"><span>${repoInitials(repo)}</span><small>${repo.primaryLanguage}</small></button>`).join('')}
          <svg viewBox="0 0 560 560" aria-hidden="true">
            <path d="M80 110 C160 40 260 140 340 90 S500 130 490 260 C470 430 300 390 240 500 C160 420 50 390 90 250" />
            <path d="M120 430 C210 310 300 330 410 170" />
            <path d="M95 250 C220 190 360 230 485 260" />
          </svg>
        </div>
      </section>
      <section class="how">
        ${['Analyze your GitHub personality', 'Swipe repositories', 'Match and chat with repo souls', 'Turn curiosity into contributions'].map((title, index) => `
          <article>
            <span>0${index + 1}</span>
            <h2>${title}</h2>
            <p>${['Reading your commit history like a tiny judgmental oracle.', 'Stop doomscrolling GitHub. Start swiping with intent.', 'Some repos want stars. Some want contributors. Some want therapy.', 'Leave with an actual first PR idea, not existential search tabs.'][index]}</p>
          </article>
        `).join('')}
      </section>
    </main>
  `;
}

function renderLoading() {
  const lines = [
    'Reading commit history like a tiny judgmental oracle...',
    'Detecting unfinished side projects...',
    'Calculating chaos compatibility...',
    'Finding repositories that can survive your architecture instincts...'
  ];

  return template`
    <main class="page loading">
      <section class="terminal-panel">
        <p class="eyebrow">github analysis</p>
        <h1>Generating your developer dating profile.</h1>
        <div class="terminal-lines">
          ${lines.map((line, index) => `<p style="--delay:${index * 0.55}s"><span>$</span> ${line}</p>`).join('')}
        </div>
        <div class="progress"><span></span></div>
      </section>
    </main>
  `;
}

function renderPersonality() {
  return template`
    <main class="page personality-layout">
      <section class="personality-card">
        <p class="eyebrow">developer personality</p>
        <h1>${developerPersonality.archetype}</h1>
        <p class="lede">${developerPersonality.summary}</p>
        <div class="split">
          <div><h2>Strengths</h2>${tagList(developerPersonality.strengths)}</div>
          <div><h2>Risks</h2>${tagList(developerPersonality.risks)}</div>
        </div>
        <div class="profile-grid">
          <p><b>Stack:</b> ${developerPersonality.preferredStacks.join(', ')}</p>
          <p><b>Architecture:</b> ${developerPersonality.architectureTendency}</p>
          <p><b>Collaboration:</b> ${developerPersonality.collaborationStyle}</p>
          <p><b>Compatibility:</b> ${developerPersonality.compatibilityStyle}</p>
        </div>
        <h2>Representative repos</h2>
        <div class="mini-repos">
          ${developerPersonality.representativeRepos.map((repo) => `<article><b>${repo.name}</b><span>${repo.language}</span><p>${repo.reason}</p><em>${repo.tag}</em></article>`).join('')}
        </div>
        <div class="actions">
          <button class="neon ghost" data-action="share">Export Image</button>
          <button class="neon primary" data-action="swipe">Start Swiping</button>
        </div>
      </section>
    </main>
  `;
}

function renderSwipe() {
  const current = repos[state.currentIndex % repos.length];
  const next = repos[(state.currentIndex + 1) % repos.length];

  return template`
    <main class="page swipe-layout">
      <aside class="side-panel">
        <p class="eyebrow">repo romance feed</p>
        <h1>Swipe like the issue tracker is watching.</h1>
        <p>Matches trigger at 70% compatibility. Super Like always creates a match because confidence is sometimes architecture.</p>
        <div class="side-stats">
          ${stat('matched', state.matches.length)}
          ${stat('interested', state.interested.length)}
          ${stat('free chats left', state.isPaid ? '∞' : Math.max(0, 3 - state.chatUsage))}
        </div>
        <button class="link-button" data-action="pricing">Upgrade to Committer</button>
      </aside>
      <section class="deck-wrap" aria-label="Swipe repository deck">
        <div class="deck">
          ${renderRepoCard(next, 'back')}
          ${renderRepoCard(current, 'front')}
        </div>
        <div class="swipe-actions">
          <button class="round skip" data-swipe="left" aria-label="Skip">×<span>Skip</span></button>
          <button class="round super" data-swipe="up" aria-label="Contribute Tonight">↑<span>Contribute Tonight</span></button>
          <button class="round yes" data-swipe="right" aria-label="Interested">♥<span>Interested</span></button>
        </div>
      </section>
    </main>
  `;
}

function renderRepoCard(repo, position) {
  return template`
    <article class="repo-card ${position}" data-card="${position}" style="--lang:${repo.languageColor}">
      <div class="swipe-label left">SKIP</div>
      <div class="swipe-label right">INTERESTED</div>
      <div class="swipe-label up">CONTRIBUTE TONIGHT</div>
      <div class="repo-visual">
        <div class="avatar">${repoInitials(repo)}</div>
        <div class="compat">${repo.compatibility}%</div>
      </div>
      <div class="repo-head">
        <p class="eyebrow">${repo.owner}</p>
        <h2>${repo.name}</h2>
        <p>${repo.description}</p>
      </div>
      <div class="stats-row">
        ${stat('stars', formatNumber(repo.stars))}
        ${stat('forks', formatNumber(repo.forks))}
        ${stat('issues', formatNumber(repo.openIssues))}
        ${stat('contributors', formatNumber(repo.contributors))}
      </div>
      <div class="tags">${tagList([repo.primaryLanguage, ...repo.topics.slice(0, 3), repo.onboardingDifficulty])}</div>
      <div class="repo-personality">
        <h3>Repo Personality</h3>
        <p>${repo.personalityLine}</p>
      </div>
      <p class="hook"><b>Suggested first contribution:</b> ${repo.suggestedFirstContribution}</p>
      <button class="details-button" data-detail="${repo.id}">Open profile</button>
    </article>
  `;
}

function renderDetailModal(repo) {
  return template`
    <div class="modal-backdrop" data-action="close-detail">
      <section class="modal" data-modal>
        <button class="close" data-action="close-detail" aria-label="Close">×</button>
        <div class="repo-visual modal-visual" style="--lang:${repo.languageColor}">
          <div class="avatar">${repoInitials(repo)}</div>
          <div class="compat">${repo.compatibility}%</div>
        </div>
        <p class="eyebrow">${repo.fullName}</p>
        <h1>${repo.name}</h1>
        <p class="lede">${repo.description}</p>
        <div class="profile-grid">
          <p><b>Activity:</b> ${repo.activityLevel}</p>
          <p><b>Difficulty:</b> ${repo.onboardingDifficulty}</p>
          <p><b>Docs:</b> ${repo.documentationQuality}</p>
          <p><b>Culture:</b> ${repo.contributorCulture}</p>
          <p><b>Maintainer vibe:</b> ${repo.maintainerVibe}</p>
          <p><b>Repo love language:</b> ${repo.repoLoveLanguage}</p>
        </div>
        <h2>Why you might match</h2>
        <p>${repo.whyYouMatch}</p>
        <div class="split">
          <div><h2>Green flags</h2>${tagList(repo.greenFlags)}</div>
          <div><h2>Red flags</h2>${tagList(repo.redFlags)}</div>
        </div>
        <h2>README summary</h2>
        <p>${repo.readmeSummary}</p>
        <div class="actions">
          <button class="neon ghost" data-swipe="left">Skip</button>
          <button class="neon primary" data-swipe="right">Interested</button>
          <button class="neon hot" data-swipe="up">Contribute Tonight</button>
          <a class="neon ghost" href="${repo.githubUrl}" target="_blank" rel="noreferrer">Open on GitHub</a>
          <a class="neon ghost" href="${repo.issuesUrl}" target="_blank" rel="noreferrer">View Issues</a>
        </div>
      </section>
    </div>
  `;
}

function renderMatch() {
  const repo = state.activeMatch;
  return template`
    <main class="match-screen">
      <div class="merge-lines"></div>
      <section class="match-panel">
        <p class="eyebrow">merge detected</p>
        <h1>MERGECONFLICT</h1>
        <h2>You matched with ${repo.fullName}</h2>
        <p class="lede">Compatibility: ${repo.compatibility}%. Merge risk: legally concerning.</p>
        <p>${repo.aiPersonaTagline}</p>
        <div class="tags">${tagList(repo.techStack.slice(0, 4))}</div>
        <p><b>First contribution:</b> ${repo.suggestedFirstContribution}</p>
        ${repo.compatibility >= 85 ? '<p class="noticed">This repo already noticed your commit history.</p>' : ''}
        <div class="actions">
          <button class="neon primary" data-action="chat">Chat with Repo</button>
          <button class="neon ghost" data-action="keep-swiping">Keep Swiping</button>
          <button class="neon ghost" data-detail="${repo.id}">Open Repo Profile</button>
        </div>
      </section>
    </main>
  `;
}

function renderChat() {
  const repo = state.chatRepo;
  const gate = createChatGate(state.chatUsage, state.isPaid);
  if (!gate.canOpenChat()) return renderUpgradePrompt(repo);

  const prompts = ['How do I run you locally?', 'What should I contribute first?', 'Explain your architecture.', 'What are your red flags?', 'Draft my first issue comment.'];

  return template`
    <main class="page chat-layout">
      <section class="chat-panel">
        <header>
          <div class="avatar small" style="--lang:${repo.languageColor}">${repoInitials(repo)}</div>
          <div>
            <p class="eyebrow">repo soul chat</p>
            <h1>${repo.fullName}</h1>
          </div>
          <span class="compat mini">${repo.compatibility}%</span>
        </header>
        <div class="messages">
          ${state.messages.map((message) => `<p class="${message.role}"><span>${message.role === 'repo' ? repo.name : 'you'}</span>${message.text}</p>`).join('')}
        </div>
        <div class="quick-prompts">
          ${prompts.map((prompt) => `<button data-prompt="${prompt}">${prompt}</button>`).join('')}
        </div>
        <form class="chat-form">
          <input name="message" placeholder="Ask the repo where to begin..." autocomplete="off" />
          <button class="neon primary">Send</button>
        </form>
        <button class="link-button" data-action="keep-swiping">Back to swipes</button>
      </section>
    </main>
  `;
}

function renderUpgradePrompt(repo) {
  return template`
    <main class="page pricing-layout">
      <section class="upgrade-panel">
        <p class="eyebrow">chat limit reached</p>
        <h1>You have used your 3 free repo soul chats this month.</h1>
        <p>Your next contribution arc deserves more than three conversations. ${repo.name} is still emotionally available, but billing has entered the chat.</p>
        <div class="actions">
          <button class="neon primary" data-action="pricing">Go Committer</button>
          <button class="neon ghost" data-action="keep-swiping">Keep Swiping</button>
        </div>
      </section>
    </main>
  `;
}

function renderPricing(asModal = false) {
  return template`
    <div class="${asModal ? 'modal-backdrop' : 'page pricing-layout'}" data-action="${asModal ? 'close-pricing' : ''}">
      <section class="pricing-card" data-modal>
        ${asModal ? '<button class="close" data-action="close-pricing" aria-label="Close">×</button>' : ''}
        <p class="eyebrow">committer tier</p>
        <h1>$5/month</h1>
        <p class="lede">Unlimited repository therapy, deeper analysis, fewer existential GitHub searches.</p>
        <ul>
          <li>Unlimited swipes and matches</li>
          <li>Unlimited repo soul chats</li>
          <li>Contribution roadmap generation</li>
          <li>Weekly personalized repo recommendations</li>
          <li>Premium profile/share customization</li>
        </ul>
        <button class="neon primary" data-action="upgrade">Go Committer</button>
      </section>
    </div>
  `;
}

function handleSwipe(direction) {
  const repo = state.detailRepo || repos[state.currentIndex % repos.length];
  const result = resolveSwipe(repo, direction);
  state.swiped.push({ repo, direction, result });
  if (result.kind === 'interested') state.interested.push(repo);
  if (result.kind === 'match') {
    state.matches.push(repo);
    setState({ activeMatch: repo, detailRepo: null, screen: 'match', currentIndex: state.currentIndex + 1 });
    return;
  }
  setState({ detailRepo: null, currentIndex: state.currentIndex + 1 });
}

function replyFor(repo, text) {
  const lower = text.toLowerCase();
  if (lower.includes('run') || lower.includes('local')) return `Start with my README, Docker notes, and one small reproduction. ${repo.onboardingDifficulty === 'Haunted' ? 'Bring snacks. My setup has lore.' : 'You will probably survive.'}`;
  if (lower.includes('architecture')) return `I am mostly ${repo.techStack.join(', ')} arranged into a product-shaped maze. Start at the contributor docs, then trace one feature end to end.`;
  if (lower.includes('red flag')) return `My red flags: ${repo.redFlags.join(', ')}. I would love to pretend that is charming, but it is mostly work.`;
  if (lower.includes('issue')) return `Try: "I can take this on. I reproduced it, here is my plan, and I will include screenshots/tests." Maintainers adore receipts.`;
  return `${repo.suggestedFirstContribution} Small, focused PRs are my love language.`;
}

function openChat(repo) {
  const gate = createChatGate(state.chatUsage, state.isPaid);
  const messages = [
    { role: 'repo', text: repo.aiPersonaTagline },
    { role: 'repo', text: `Start with this: ${repo.suggestedFirstContribution}` }
  ];
  setState({
    screen: 'chat',
    chatRepo: repo,
    chatUsage: gate.canOpenChat() && !state.isPaid ? state.chatUsage + 1 : state.chatUsage,
    messages
  });
}

function bindEvents() {
  document.querySelectorAll('[data-action="start"]').forEach((button) => button.addEventListener('click', () => {
    setState({ screen: 'loading' });
    setTimeout(() => setState({ screen: 'personality' }), 2700);
  }));

  document.querySelector('[data-action="swipe"]')?.addEventListener('click', () => setState({ screen: 'swipe' }));
  document.querySelector('[data-action="share"]')?.addEventListener('click', (event) => {
    event.currentTarget.textContent = 'Image export mocked';
  });
  document.querySelectorAll('[data-action="pricing"]').forEach((button) => button.addEventListener('click', () => setState({ screen: 'pricing' })));
  document.querySelectorAll('[data-action="close-pricing"]').forEach((button) => button.addEventListener('click', (event) => {
    if (event.target === event.currentTarget || event.target.dataset.action === 'close-pricing') setState({ screen: 'swipe' });
  }));
  document.querySelector('[data-action="upgrade"]')?.addEventListener('click', () => setState({ isPaid: true, screen: 'swipe' }));
  document.querySelectorAll('[data-swipe]').forEach((button) => button.addEventListener('click', () => handleSwipe(button.dataset.swipe)));
  document.querySelectorAll('[data-detail]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    setState({ detailRepo: repos.find((repo) => repo.id === button.dataset.detail) });
  }));
  document.querySelectorAll('[data-action="close-detail"]').forEach((node) => node.addEventListener('click', (event) => {
    if (event.target === event.currentTarget || event.target.dataset.action === 'close-detail') setState({ detailRepo: null });
  }));
  document.querySelector('[data-action="keep-swiping"]')?.addEventListener('click', () => setState({ screen: 'swipe', activeMatch: null }));
  document.querySelector('[data-action="chat"]')?.addEventListener('click', () => openChat(state.activeMatch));
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => sendMessage(button.dataset.prompt)));
  document.querySelector('.chat-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    if (input.value.trim()) sendMessage(input.value.trim());
  });
  bindDrag();
}

function sendMessage(text) {
  const repo = state.chatRepo;
  state.messages.push({ role: 'user', text });
  state.messages.push({ role: 'repo', text: replyFor(repo, text) });
  render();
}

function bindDrag() {
  const card = document.querySelector('[data-card="front"]');
  if (!card) return;

  let startX = 0;
  let startY = 0;
  let x = 0;
  let y = 0;
  let dragging = false;

  card.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    card.setPointerCapture(event.pointerId);
    card.classList.add('dragging');
  });

  card.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    x = event.clientX - startX;
    y = event.clientY - startY;
    const rotate = x / 18;
    card.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(1.02)`;
    card.dataset.intent = getSwipeDirection(x, y);
  });

  card.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    const direction = getSwipeDirection(x, y);
    card.classList.remove('dragging');
    if (direction === 'none') {
      card.style.transform = '';
      card.dataset.intent = 'none';
      return;
    }
    card.classList.add(`exit-${direction}`);
    setTimeout(() => handleSwipe(direction), 260);
  });
}

render();
