// DOM elements
const opportunityList = document.getElementById('opportunityList');
const workspace = document.getElementById('workspace');
const tenantButtons = document.querySelectorAll('.tenant-btn');

let currentTenantId = 'tenant-nordstern';
let currentOpportunityId = null;

// Initialize the app
async function init() {
  await loadSalesOpportunities(currentTenantId);
}

// Load sales opportunities for the given tenant
async function loadSalesOpportunities(tenantId) {
  try {
    const response = await fetch(`/api/tenants/${tenantId}/opportunities`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    renderOpportunityList(data.opportunities);
  } catch (error) {
    console.error('Error loading opportunities:', error);
    opportunityList.innerHTML = '<p>Error loading opportunities</p>';
  }
}

// Render the list of sales opportunities
function renderOpportunityList(opportunities) {
  opportunityList.innerHTML = '';

  if (opportunities.length === 0) {
    opportunityList.innerHTML = '<p>No opportunities found</p>';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'opportunity-list';

  opportunities.forEach(opportunity => {
    const listItem = document.createElement('li');
    listItem.className = 'opportunity-item';
    listItem.dataset.id = opportunity.id;

    listItem.innerHTML = `
      <h3>${opportunity.name}</h3>
      <p>Status: ${opportunity.status}</p>
      <button class="select-opportunity-btn" data-id="${opportunity.id}">View Details</button>
    `;

    list.appendChild(listItem);
  });

  opportunityList.appendChild(list);

  // Add event listeners to the buttons
  document.querySelectorAll('.select-opportunity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      loadOpportunityDetails(id);
    });
  });
}

// Load details for a specific opportunity
async function loadOpportunityDetails(opportunityId) {
  try {
    currentOpportunityId = opportunityId;

    // Fetch conversations
    const conversationResponse = await fetch(`/api/tenants/${currentTenantId}/opportunities/${opportunityId}/conversations`);
    const conversationData = await conversationResponse.json();

    // Fetch artifacts
    const artifactResponse = await fetch(`/api/tenants/${currentTenantId}/opportunities/${opportunityId}/artifacts`);
    const artifactData = await artifactResponse.json();

    renderWorkspace(opportunityId, conversationData.conversations, artifactData.artifacts);
  } catch (error) {
    console.error('Error loading opportunity details:', error);
    workspace.innerHTML = '<p>Error loading opportunity details</p>';
  }
}

// Render the workspace with tabs
function renderWorkspace(opportunityId, conversations, artifacts) {
  workspace.innerHTML = `
    <div class="workspace-header">
      <h2>Sales Opportunity: ${opportunityId}</h2>
      <div class="tab-container">
        <button class="tab-btn active" data-tab="activities">Activities</button>
        <button class="tab-btn" data-tab="documents">Documents</button>
        <button class="tab-btn" data-tab="conversations">Conversations</button>
        <button class="tab-btn" data-tab="artifacts">Artifacts</button>
      </div>
    </div>

    <div class="tab-content">
      <!-- Activities content will be populated here -->
    </div>
  `;

  // Add event listeners to tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      showTab(tab, conversations, artifacts);
    });
  });

  // Show initial tab
  showTab('activities', conversations, artifacts);
}

// Show content for a specific tab
function showTab(tabName, conversations, artifacts) {
  const tabContent = document.querySelector('.tab-content');

  switch (tabName) {
    case 'activities':
      tabContent.innerHTML = '<p>Activities will be displayed here</p>';
      break;
    case 'documents':
      tabContent.innerHTML = '<p>Documents will be displayed here</p>';
      break;
    case 'conversations':
      renderConversations(conversations);
      break;
    case 'artifacts':
      renderArtifacts(artifacts);
      break;
  }

  // Update active tab button
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
}

// Render conversations in the UI
function renderConversations(conversations) {
  const tabContent = document.querySelector('.tab-content');

  if (conversations.length === 0) {
    tabContent.innerHTML = '<p>No conversations found</p>';
    return;
  }

  let html = '<div class="conversation-list">
    <button id="new-conversation-btn" class="btn primary">New Conversation</button>
  ';

  conversations.forEach(conv => {
    html += `
      <div class="conversation-item">
        <h3>${conv.title}</h3>
        <p>Created: ${new Date(conv.createdAt).toLocaleString()}</p>
        <button class="btn" data-conversation-id="${conv.id}">View Messages</button>
      </div>
    `;
  });

  html += '</div>';
  tabContent.innerHTML = html;

  // Add event listeners to conversation buttons
  document.querySelectorAll('.conversation-item .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.conversationId;
      loadConversationMessages(id);
    });
  });

  // Add event listener for new conversation button
  document.getElementById('new-conversation-btn').addEventListener('click', createNewConversation);
}

// Render artifacts in the UI
function renderArtifacts(artifacts) {
  const tabContent = document.querySelector('.tab-content');

  if (artifacts.length === 0) {
    tabContent.innerHTML = '<p>No artifacts found</p>';
    return;
  }

  let html = '<div class="artifact-list">';

  artifacts.forEach(artifact => {
    html += `
      <div class="artifact-item">
        <h3>${artifact.name}</h3>
        <p>Type: ${artifact.type}</p>
        <p>Created: ${new Date(artifact.createdAt).toLocaleString()}</p>
        <pre class="artifact-content">${artifact.content.substring(0, 200)}...</pre>
      </div>
    `;
  });

  html += '</div>';
  tabContent.innerHTML = html;
}

// Load messages for a specific conversation
async function loadConversationMessages(conversationId) {
  try {
    const response = await fetch(`/api/tenants/${currentTenantId}/opportunities/${currentOpportunityId}/conversations/${conversationId}/chat`);
    const data = await response.json();

    // Display messages in a modal or new view
    alert('Conversation messages loaded. In a real implementation, these would be displayed in a proper UI.');
  } catch (error) {
    console.error('Error loading conversation messages:', error);
    alert('Error loading conversation messages');
  }
}

// Create a new conversation
async function createNewConversation() {
  const title = prompt('Enter conversation title:');

  if (!title) return;

  try {
    const response = await fetch(`/api/tenants/${currentTenantId}/opportunities/${currentOpportunityId}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    alert('Conversation created successfully');
    loadOpportunityDetails(currentOpportunityId);
  } catch (error) {
    console.error('Error creating conversation:', error);
    alert('Error creating conversation');
  }
}

// Event listeners for tenant buttons
tenantButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentTenantId = button.dataset.tenant;

    // Update active button
    tenantButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Load opportunities for selected tenant
    loadSalesOpportunities(currentTenantId);
  });
});

// Initialize the app
init();
