const state = {
  context: null,
  details: null,
  activeOpportunityId: null,
  activeConversationId: null,
  activeSection: 'overview'
};

const byId = id => document.getElementById(id);

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.dataset) Object.assign(node.dataset, options.dataset);
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) node.setAttribute(name, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function replaceChildren(target, children) {
  target.replaceChildren(...children);
}

function emptyState(message) {
  return el('div', { className: 'empty-state', text: message });
}

function formatDate(value, withTime = true) {
  if (!value) return 'Nicht terminiert';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Ungültiger Termin';
  return new Intl.DateTimeFormat('de-AT', {
    dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {})
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(value || 0);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || 'Die Anfrage ist fehlgeschlagen.');
  }
  return body;
}

let toastTimer;
function toast(message, isError = false) {
  const target = byId('toast');
  target.textContent = message;
  target.classList.toggle('is-error', isError);
  target.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { target.hidden = true; }, 5000);
}

function setLoading(loading) {
  byId('loading-state').hidden = !loading;
  if (loading) byId('error-state').hidden = true;
}

function showError(error) {
  const target = byId('error-state');
  target.textContent = error.message || String(error);
  target.hidden = false;
}

async function initialize() {
  try {
    state.context = await api('/api/context');
    byId('tenant-name').textContent = state.context.tenant.name;
    const status = byId('copilot-status');
    status.textContent = state.context.copilotConfigured
      ? 'Copilot verbunden' : 'Copilot noch nicht verbunden';
    status.classList.toggle('is-ready', state.context.copilotConfigured);
    renderOpportunitySwitcher();
    const remembered = localStorage.getItem('mini-crm-opportunity');
    const initial = state.context.opportunities.find(item => item.id === remembered)
      || state.context.opportunities[0];
    if (initial) await loadOpportunity(initial.id);
    else {
      setLoading(false);
      byId('active-opportunity-name').textContent = 'Neue Verkaufschance anlegen';
      byId('opportunity-dialog').showModal();
    }
  } catch (error) {
    setLoading(false);
    showError(error);
  }
}

async function loadOpportunity(opportunityId) {
  setLoading(true);
  try {
    state.details = await api(`/api/opportunities/${encodeURIComponent(opportunityId)}`);
    state.activeOpportunityId = opportunityId;
    localStorage.setItem('mini-crm-opportunity', opportunityId);
    const availableConversation = state.details.conversations.find(
      item => item.id === state.activeConversationId
    ) || state.details.conversations[0] || null;
    state.activeConversationId = availableConversation?.id || null;
    renderAll();
    setLoading(false);
  } catch (error) {
    setLoading(false);
    showError(error);
  }
}

function renderAll() {
  const data = state.details;
  const opportunity = data.opportunity;
  byId('active-opportunity-name').textContent = `${opportunity.company} · ${opportunity.name}`;
  byId('overview-title').textContent = opportunity.name;
  byId('opportunity-description').textContent = `${opportunity.company} – ${opportunity.description}`;
  byId('opportunity-status').textContent = opportunity.status;
  byId('metric-value').textContent = formatCurrency(opportunity.valueEur);
  byId('metric-todos').textContent = String(data.todos.filter(item => !item.completed).length);
  byId('metric-appointment').textContent = data.appointments[0]
    ? formatDate(data.appointments[0].scheduledAt) : 'Kein Termin';
  byId('metric-artifacts').textContent = String(data.artifacts.length);
  byId('next-step').textContent = opportunity.nextStep || 'Nächsten Schritt festlegen';
  renderTimeline();
  renderAppointments();
  renderTodos();
  renderNotes();
  renderDocuments();
  renderConversations();
  renderArtifacts();
  renderOpportunitySwitcher();
}

function renderTimeline() {
  const entries = [
    ...state.details.appointments.map(item => ({ date: item.createdAt, text: `Termin: ${item.title}` })),
    ...state.details.notes.map(item => ({ date: item.createdAt, text: `Notiz: ${item.title}` })),
    ...state.details.documents.map(item => ({ date: item.createdAt, text: `Dokument: ${item.name}` })),
    ...state.details.artifacts.map(item => ({ date: item.createdAt, text: `KI-Artefakt: ${item.title}` }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  replaceChildren(byId('timeline-list'), entries.length
    ? entries.map(entry => el('li', {}, [
      el('span', { text: formatDate(entry.date) }),
      el('strong', { text: entry.text })
    ]))
    : [emptyState('Noch keine Aktivitäten vorhanden.')]);
}

function renderAppointments() {
  const items = state.details.appointments.map(appointment =>
    el('article', { className: 'list-card' }, [
      el('div', {}, [el('strong', { text: appointment.title }),
        el('span', { text: `${formatDate(appointment.scheduledAt)} · ${appointment.durationMinutes} Minuten` })]),
      el('span', { className: 'list-meta', text: appointment.location || 'Ohne Ortsangabe' })
    ]));
  byId('appointment-count').textContent = String(items.length);
  replaceChildren(byId('appointment-list'), items.length ? items : [emptyState('Noch kein Termin geplant.')]);
}

function renderTodos() {
  const items = state.details.todos.map(todo => {
    const checkbox = el('input', { type: 'checkbox', attrs: { 'aria-label': `Aufgabe ${todo.title} erledigt` } });
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', async () => {
      try {
        await api(`/api/opportunities/${encodeURIComponent(state.activeOpportunityId)}/todos/${encodeURIComponent(todo.id)}`, {
          method: 'PATCH', body: JSON.stringify({ completed: checkbox.checked })
        });
        await loadOpportunity(state.activeOpportunityId);
        toast('Aufgabe aktualisiert.');
      } catch (error) { checkbox.checked = !checkbox.checked; toast(error.message, true); }
    });
    return el('label', { className: `todo-card${todo.completed ? ' is-complete' : ''}` }, [
      checkbox,
      el('span', {}, [el('strong', { text: todo.title }),
        el('small', { text: todo.dueAt ? `Fällig: ${formatDate(todo.dueAt)}` : 'Ohne Fälligkeit' })])
    ]);
  });
  byId('todo-count').textContent = String(items.length);
  replaceChildren(byId('todo-list'), items.length ? items : [emptyState('Keine offenen Aufgaben.')]);
}

function renderNotes() {
  const items = state.details.notes.map(note => el('article', { className: 'text-card' }, [
    el('div', { className: 'card-title-row' }, [el('strong', { text: note.title }), el('time', { text: formatDate(note.createdAt, false) })]),
    el('p', { text: note.content })
  ]));
  byId('note-count').textContent = String(items.length);
  replaceChildren(byId('note-list'), items.length ? items : [emptyState('Noch keine Notizen vorhanden.')]);
}

function renderDocuments() {
  const items = state.details.documents.map(document => {
    const details = el('details', { className: 'document-card' }, [
      el('summary', {}, [el('strong', { text: document.name }), el('span', { text: document.source })]),
      el('p', { text: document.content })
    ]);
    return details;
  });
  byId('document-count').textContent = String(items.length);
  replaceChildren(byId('document-list'), items.length ? items : [emptyState('Noch keine Dokumente vorhanden.')]);

  const checks = state.details.documents.map(document => {
    const input = el('input', { type: 'checkbox' });
    input.value = document.id;
    input.name = 'selectedDocumentIds';
    return el('label', { className: 'check-control' }, [input, el('span', { text: document.name })]);
  });
  replaceChildren(byId('copilot-documents'), checks.length ? checks : [
    el('span', { className: 'field-hint', text: 'Keine Dokumente in dieser Verkaufschance.' })
  ]);
}

function renderConversations() {
  const buttons = state.details.conversations.map(conversation => {
    const button = el('button', {
      type: 'button', className: conversation.id === state.activeConversationId ? 'is-active' : '',
      attrs: { 'aria-pressed': String(conversation.id === state.activeConversationId) }
    }, [el('strong', { text: conversation.title }), el('span', { text: `${conversation.messages.length} Nachrichten` })]);
    button.addEventListener('click', () => {
      state.activeConversationId = conversation.id;
      renderConversations();
    });
    return button;
  });
  replaceChildren(byId('conversation-list'), buttons.length ? buttons : [emptyState('Starten Sie eine neue Unterhaltung.')]);

  const active = state.details.conversations.find(item => item.id === state.activeConversationId);
  byId('chat-heading').querySelector('h2').textContent = active?.title || 'Unterhaltung auswählen';
  const messages = active?.messages.map(message => el('article', {
    className: `message ${message.role === 'assistant' ? 'assistant' : 'user'}`
  }, [
    el('div', { className: 'message-meta', text: message.role === 'assistant' ? 'Opportunity Copilot' : 'Sie' }),
    el('p', { text: message.content }),
    el('time', { text: formatDate(message.createdAt) })
  ])) || [];
  replaceChildren(byId('message-list'), messages.length ? messages : [
    emptyState(active ? 'Stellen Sie die erste Frage in dieser Unterhaltung.' : 'Wählen oder erstellen Sie eine Unterhaltung.')
  ]);
  byId('copilot-form').querySelectorAll('textarea, input, select, button').forEach(control => {
    if (!control.closest('.quick-actions')) control.disabled = !active;
  });
}

function renderArtifacts() {
  const items = state.details.artifacts.map(artifact => {
    const sourceList = el('ul', { className: 'source-list' },
      artifact.sources.map(source => el('li', { text: source })));
    return el('article', { className: 'artifact-card' }, [
      el('div', { className: 'artifact-heading' }, [
        el('span', { className: 'artifact-type', text: artifact.type }),
        el('time', { text: formatDate(artifact.createdAt) })
      ]),
      el('h2', { text: artifact.title }),
      el('p', { className: 'artifact-preview', text: artifact.content }),
      el('details', {}, [
        el('summary', { text: 'Evidenz und Quellen' }),
        el('dl', { className: 'evidence-grid' }, [
          el('dt', { text: 'Assistent' }), el('dd', { text: artifact.assistantRelease }),
          el('dt', { text: 'Modellprofil' }), el('dd', { text: artifact.modelProfile }),
          el('dt', { text: 'Modell' }), el('dd', { text: artifact.modelName }),
          el('dt', { text: 'Konfidenz' }), el('dd', { text: artifact.confidence })
        ]), sourceList
      ])
    ]);
  });
  replaceChildren(byId('artifact-list'), items.length ? items : [emptyState('Noch keine KI-Ergebnisse als Artefakt gespeichert.')]);
}

function renderOpportunitySwitcher() {
  if (!state.context) return;
  const buttons = state.context.opportunities.map(opportunity => {
    const button = el('button', {
      type: 'button',
      className: opportunity.id === state.activeOpportunityId ? 'is-active' : ''
    }, [
      el('span', {}, [el('strong', { text: opportunity.company }), el('small', { text: opportunity.name })]),
      el('span', { className: 'stage-badge', text: opportunity.status })
    ]);
    button.addEventListener('click', async () => {
      byId('opportunity-dialog').close();
      state.activeConversationId = null;
      await loadOpportunity(opportunity.id);
      toast(`Kontext gewechselt: ${opportunity.company}`);
    });
    return button;
  });
  replaceChildren(byId('opportunity-list'), buttons.length ? buttons : [emptyState('Noch keine Verkaufschance vorhanden.')]);
}

function showSection(section) {
  state.activeSection = section;
  document.querySelectorAll('.workspace-section').forEach(node => {
    node.hidden = node.id !== `section-${section}`;
  });
  document.querySelectorAll('[data-section]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.section === section);
  });
  byId(`section-${section}`).querySelector('h1')?.focus?.({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function bindCreateForm(formId, subpath, transform = value => value) {
  byId(formId).addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const body = transform(formJson(form));
      await api(`/api/opportunities/${encodeURIComponent(state.activeOpportunityId)}/${subpath}`, {
        method: 'POST', body: JSON.stringify(body)
      });
      form.reset();
      await loadOpportunity(state.activeOpportunityId);
      toast('Eintrag gespeichert.');
    } catch (error) { toast(error.message, true); }
    finally { submit.disabled = false; }
  });
}

document.querySelectorAll('[data-section]').forEach(button => {
  button.addEventListener('click', () => showSection(button.dataset.section));
});
document.querySelectorAll('[data-go]').forEach(button => {
  button.addEventListener('click', () => showSection(button.dataset.go));
});
byId('open-switcher').addEventListener('click', () => byId('opportunity-dialog').showModal());
byId('close-switcher').addEventListener('click', () => byId('opportunity-dialog').close());
byId('opportunity-dialog').addEventListener('click', event => {
  if (event.target === byId('opportunity-dialog')) byId('opportunity-dialog').close();
});

byId('opportunity-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const result = await api('/api/opportunities', {
      method: 'POST', body: JSON.stringify(formJson(form))
    });
    state.context = await api('/api/context');
    form.reset();
    byId('opportunity-dialog').close();
    await loadOpportunity(result.opportunity.id);
    toast('Verkaufschance angelegt.');
  } catch (error) { toast(error.message, true); }
});

bindCreateForm('appointment-form', 'appointments', value => ({
  ...value,
  scheduledAt: value.scheduledAt ? new Date(value.scheduledAt).toISOString() : '',
  durationMinutes: Number(value.durationMinutes)
}));
bindCreateForm('todo-form', 'todos', value => ({
  ...value, dueAt: value.dueAt ? new Date(value.dueAt).toISOString() : null
}));
bindCreateForm('note-form', 'notes');
bindCreateForm('document-form', 'documents');

byId('new-conversation').addEventListener('click', async () => {
  const title = window.prompt('Titel der neuen Unterhaltung:');
  if (!title) return;
  try {
    const result = await api(`/api/opportunities/${encodeURIComponent(state.activeOpportunityId)}/conversations`, {
      method: 'POST', body: JSON.stringify({ title })
    });
    state.activeConversationId = result.conversation.id;
    await loadOpportunity(state.activeOpportunityId);
    toast('Unterhaltung angelegt.');
  } catch (error) { toast(error.message, true); }
});

document.querySelectorAll('.quick-actions button').forEach(button => {
  button.addEventListener('click', () => {
    byId('copilot-message').value = button.dataset.prompt;
    byId('copilot-form').elements.artifactType.value = button.dataset.type;
    byId('copilot-message').focus();
  });
});

byId('copilot-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.activeConversationId) {
    toast('Bitte zuerst eine Unterhaltung anlegen.', true);
    return;
  }
  const form = event.currentTarget;
  const submit = byId('send-copilot');
  submit.disabled = true;
  submit.textContent = 'AIDA arbeitet …';
  const data = formJson(form);
  const selectedDocumentIds = [...form.querySelectorAll('input[name="selectedDocumentIds"]:checked')]
    .map(input => input.value);
  try {
    await api(`/api/opportunities/${encodeURIComponent(state.activeOpportunityId)}/copilot`, {
      method: 'POST',
      body: JSON.stringify({
        conversationId: state.activeConversationId,
        message: data.message,
        artifactType: data.artifactType,
        artifactTitle: data.artifactTitle,
        saveArtifact: form.elements.saveArtifact.checked,
        selectedDocumentIds
      })
    });
    form.elements.message.value = '';
    await loadOpportunity(state.activeOpportunityId);
    toast('AIDA-Entwurf wurde erstellt und im aktiven Kontext gespeichert.');
  } catch (error) { toast(error.message, true); }
  finally {
    submit.disabled = false;
    submit.textContent = 'Entwurf erstellen';
  }
});

initialize();
