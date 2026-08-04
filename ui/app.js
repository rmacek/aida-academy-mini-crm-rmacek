// Mock tenant and opportunity IDs
const mockTenantId = 'nordstern';
const mockOpportunityId = 'opp1-nordstern';

// Set initial context in header
document.getElementById('tenantId').textContent = mockTenantId;
document.getElementById('salesOpportunityId').textContent = mockOpportunityId;

// Switcher dialog setup
const switcherBtn = document.getElementById('switcherBtn');
const switcherDialog = document.getElementById('switcherDialog');
const closeDialogBtn = document.getElementById('closeDialogBtn');

switcherBtn.addEventListener('click', () => {
  switcherDialog.showModal();
  loadOpportunities();
});

closeDialogBtn.addEventListener('click', () => {
  switcherDialog.close();
});

// Load opportunities for the dialog
async function loadOpportunities() {
  const opportunitiesList = document.getElementById('opportunitiesList');

  try {
    // In a real app, this would fetch from server
    const mockOpportunities = [
      { id: 'opp1-nordstern', title: 'Enterprise Software Deal' },
      { id: 'opp2-nordstern', title: 'Cloud Migration Project' },
      { id: 'opp1-alpenblick', title: 'Retail Chain Expansion' }
    ];

    opportunitiesList.innerHTML = mockOpportunities.map(opp => `
      <button class="opportunity-item" data-id="${opp.id}">${opp.title}</button>
    `).join('');

    document.querySelectorAll('.opportunity-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const newOpportunityId = btn.dataset.id;
        // Update context in header
        document.getElementById('salesOpportunityId').textContent = newOpportunityId;
        switcherDialog.close();
        // Here would refresh UI with new data
      });
    });
  } catch (err) {
    console.error('Failed to load opportunities:', err);
  }
}

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Remove active class from all buttons and contents
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to clicked button and corresponding content
    button.classList.add('active');
    const tabName = button.dataset.tab;
    document.getElementById(`${tabName}Tab`).classList.add('active');
  });
});

// Initialize UI
loadOpportunities();