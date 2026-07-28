const API_BASE = 'https://your-backend.onrender.com/api';

let transactions = [];
let goals = [];
let currentUser = null; 

function getToken() {
    return localStorage.getItem('vault_token');
}

function setSession(token, user) {
    localStorage.setItem('vault_token', token);
    localStorage.setItem('vault_user', JSON.stringify(user));
    currentUser = user;
}

function clearSession() {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
    currentUser = null;
}

async function apiRequest(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...options
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
            clearSession();
            showAuthScreen();
        }
        throw new Error(body.error || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
}

async function loadData() {
    try {
        const [transactionsData, goalsData] = await Promise.all([
            apiRequest('/transactions'),
            apiRequest('/goals')
        ]);
        transactions = transactionsData;
        goals = goalsData;
    } catch (err) {
        console.error('Failed to load data from backend:', err);
        showToast('Could not connect to the backend. Is the server running?');
    }
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');

    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.username;
        document.getElementById('user-avatar').textContent = currentUser.username.slice(0, 2).toUpperCase();
    }
}

function setAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    hideAuthError();
}

function showAuthError(message) {
    const el = document.getElementById('auth-error');
    el.textContent = message;
    el.classList.add('visible');
}

function hideAuthError() {
    const el = document.getElementById('auth-error');
    el.classList.remove('visible');
    el.textContent = '';
}

function initAuthForms() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthError();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const result = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            setSession(result.token, result.user);
            await loadData();
            showApp();
            updateDashboard();
        } catch (err) {
            showAuthError(err.message || 'Log in failed');
        }
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthError();

        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        try {
            const result = await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            setSession(result.token, result.user);
            await loadData();
            showApp();
            updateDashboard();
        } catch (err) {
            showAuthError(err.message || 'Sign up failed');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        clearSession();
        transactions = [];
        goals = [];
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
        setAuthTab('login');
        showAuthScreen();
    });
}

async function checkExistingSession() {
    const token = getToken();
    if (!token) {
        showAuthScreen();
        return;
    }

    try {
        const user = await apiRequest('/auth/me');
        currentUser = user;
        await loadData();
        showApp();
        updateDashboard();
    } catch (err) {
        clearSession();
        showAuthScreen();
    }
}

let currentTransactionType = 'expense';
let selectedGoalColor = '#6366f1';

const categories = {
    food: { icon: 'fa-utensils', label: 'Food & Dining', color: '#f59e0b' },
    transport: { icon: 'fa-car', label: 'Transport', color: '#3b82f6' },
    shopping: { icon: 'fa-shopping-bag', label: 'Shopping', color: '#ec4899' },
    entertainment: { icon: 'fa-film', label: 'Entertainment', color: '#8b5cf6' },
    bills: { icon: 'fa-file-invoice', label: 'Bills', color: '#ef4444' },
    health: { icon: 'fa-heartbeat', label: 'Health', color: '#10b981' },
    income: { icon: 'fa-money-bill-wave', label: 'Income', color: '#6366f1' },
    other: { icon: 'fa-tag', label: 'Other', color: '#6b7280' }
};

document.addEventListener('DOMContentLoaded', async () => {
    initAuthForms();
    initNavigation();
    initForms();
    initAddFundsForm();
    initColorPicker();
    initCharts();
    init3DTilt();

    document.getElementById('transaction-date').valueAsDate = new Date();

    await checkExistingSession();
});

function initNavigation() {
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
            
            document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard',
        transactions: 'Transactions',
        savings: 'Savings Goals',
        analytics: 'Analytics'
    };
    document.getElementById('page-title').textContent = titles[pageId];
    
    if (pageId === 'savings') renderSavingsGoals();
    if (pageId === 'transactions') renderTransactionsTable();
    if (pageId === 'analytics') updateAnalyticsCharts();
}

function updateDashboard() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = goals.reduce((sum, g) => sum + g.current, 0);
    
    animateValue('total-income', income);
    animateValue('total-expenses', expenses);
    animateValue('net-balance', income - expenses);
    animateValue('total-savings', savings);
    animateValue('savings-total', savings);
    
    renderRecentTransactions();
    renderGoals();
    updateExpenseChart();
}

function animateValue(id, value) {
    const el = document.getElementById(id);
    const start = parseFloat(el.textContent.replace(/[₱,]/g, '')) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = start + (value - start) * easeProgress;
        el.textContent = '₱' + current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        if (progress < 1) requestAnimationFrame(update);
    }
    
    requestAnimationFrame(update);
}

function renderRecentTransactions() {
    const container = document.getElementById('recent-transactions');
    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    container.innerHTML = recent.map(t => `
        <div class="transaction-item">
            <div class="transaction-icon" style="background: ${categories[t.category]?.color || '#6b7280'}20; color: ${categories[t.category]?.color || '#6b7280'}">
                <i class="fas ${categories[t.category]?.icon || 'fa-tag'}"></i>
            </div>
            <div class="transaction-details">
                <div class="transaction-title">${t.description}</div>
                <div class="transaction-meta">${categories[t.category]?.label || t.category} • ${formatDate(t.date)}</div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'}₱${t.amount.toFixed(2)}
            </div>
        </div>
    `).join('');
}

function renderGoals() {
    const container = document.getElementById('goals-grid');
    container.innerHTML = goals.slice(0, 3).map(goal => createGoalCard(goal)).join('');
}

function renderSavingsGoals() {
    const container = document.getElementById('savings-goals-grid');
    container.innerHTML = goals.map(goal => createGoalCard(goal)).join('');
}

function createGoalCard(goal) {
    const percent = Math.min((goal.current / goal.target) * 100, 100);
    const remaining = goal.target - goal.current;
    
    return `
        <div class="goal-card">
            <div class="goal-header">
                <div>
                    <div class="goal-title">${goal.name}</div>
                    <div class="goal-target">Target: ₱${goal.target.toLocaleString()}</div>
                </div>
                <div class="goal-header-icons">
                    <div style="color: ${goal.color}; font-size: 1.5rem;">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <button type="button" class="goal-delete-btn" onclick="deleteGoal(${goal.id})" title="Delete goal">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="goal-amount" style="color: ${goal.color}">₱${goal.current.toLocaleString()}</div>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%; background: ${goal.color};"></div>
                </div>
                <div class="goal-stats">
                    <span>${percent.toFixed(1)}% complete</span>
                    <span>₱${remaining.toLocaleString()} left</span>
                </div>
            </div>
            <button type="button" class="btn-text add-funds-btn" onclick="openAddFundsModal(${goal.id})">
                <i class="fas fa-plus"></i> Add Funds
            </button>
        </div>
    `;
}

async function deleteGoal(id) {
    if (!confirm('Delete this savings goal? This cannot be undone.')) return;

    try {
        await apiRequest(`/goals/${id}`, { method: 'DELETE' });
        goals = goals.filter(g => g.id !== id);
        updateDashboard();
        renderSavingsGoals();
        showToast('Goal deleted');
    } catch (err) {
        showToast(err.message || 'Failed to delete goal');
    }
}

function renderTransactionsTable() {
    const tbody = document.getElementById('transactions-table-body');
    const search = document.getElementById('search-transactions')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('filter-category')?.value || '';
    
    let filtered = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (search) {
        filtered = filtered.filter(t => t.description.toLowerCase().includes(search));
    }
    if (categoryFilter) {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    tbody.innerHTML = filtered.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.description}</td>
            <td><span class="category-badge ${t.category}"><i class="fas ${categories[t.category]?.icon || 'fa-tag'}"></i> ${categories[t.category]?.label || t.category}</span></td>
            <td class="amount-cell ${t.type}">${t.type === 'income' ? '+' : '-'}₱${t.amount.toFixed(2)}</td>
            <td>
                <button class="action-btn" onclick="deleteTransaction(${t.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function initForms() {
    document.getElementById('transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            type: currentTransactionType,
            amount: parseFloat(document.getElementById('transaction-amount').value),
            description: document.getElementById('transaction-desc').value,
            category: document.getElementById('transaction-category').value,
            date: document.getElementById('transaction-date').value
        };

        try {
            const created = await apiRequest('/transactions', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            transactions.push(created);

            closeModal('transaction-modal');
            e.target.reset();
            document.getElementById('transaction-date').valueAsDate = new Date();
            setTransactionType('expense');

            updateDashboard();
            renderTransactionsTable();
            showToast('Transaction added successfully!');
        } catch (err) {
            showToast(err.message || 'Failed to add transaction');
        }
    });
    
    document.getElementById('goal-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value) || 0,
            color: selectedGoalColor,
            date: document.getElementById('goal-date').value
        };

        try {
            const created = await apiRequest('/goals', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            goals.push(created);

            closeModal('goal-modal');
            e.target.reset();

            updateDashboard();
            renderSavingsGoals();
            showToast('Savings goal created!');
        } catch (err) {
            showToast(err.message || 'Failed to create goal');
        }
    });
    
    document.getElementById('search-transactions')?.addEventListener('input', renderTransactionsTable);
    document.getElementById('filter-category')?.addEventListener('change', renderTransactionsTable);
}

function setTransactionType(type) {
    currentTransactionType = type;
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    const categorySelect = document.getElementById('transaction-category');
    if (type === 'income') {
        categorySelect.innerHTML = '<option value="income">Income</option><option value="other">Other</option>';
    } else {
        categorySelect.innerHTML = `
            <option value="food">Food & Dining</option>
            <option value="transport">Transport</option>
            <option value="shopping">Shopping</option>
            <option value="entertainment">Entertainment</option>
            <option value="bills">Bills & Utilities</option>
            <option value="health">Health</option>
            <option value="other">Other</option>
        `;
    }
}

function initColorPicker() {
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedGoalColor = option.dataset.color;
        });
    });
}

function openAddFundsModal(goalId) {
    document.getElementById('add-funds-goal-id').value = goalId;
    document.getElementById('add-funds-amount').value = '';
    openModal('add-funds-modal');
}

function initAddFundsForm() {
    document.getElementById('add-funds-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const goalId = Number(document.getElementById('add-funds-goal-id').value);
        const amountToAdd = parseFloat(document.getElementById('add-funds-amount').value);
        const goal = goals.find(g => g.id === goalId);
        if (!goal || isNaN(amountToAdd) || amountToAdd <= 0) return;

        try {
            const updated = await apiRequest(`/goals/${goalId}`, {
                method: 'PUT',
                body: JSON.stringify({ current: goal.current + amountToAdd })
            });
            Object.assign(goal, updated);

            closeModal('add-funds-modal');
            e.target.reset();

            updateDashboard();
            renderSavingsGoals();
            showToast('Funds added to goal!');
        } catch (err) {
            showToast(err.message || 'Failed to add funds');
        }
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;

    try {
        await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
        transactions = transactions.filter(t => t.id !== id);
        updateDashboard();
        renderTransactionsTable();
        showToast('Transaction deleted');
    } catch (err) {
        showToast(err.message || 'Failed to delete transaction');
    }
}

let expenseChart, monthlyChart, categoryChart;

function initCharts() {
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(expenseCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%',
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 15, 26, 0.9)', padding: 12, cornerRadius: 8 } }
        }
    });
}

function updateExpenseChart() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    
    const labels = Object.keys(categoryTotals).map(c => categories[c]?.label || c);
    const data = Object.values(categoryTotals);
    const colors = Object.keys(categoryTotals).map(c => categories[c]?.color || '#6b7280');
    
    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data = data;
    expenseChart.data.datasets[0].backgroundColor = colors;
    expenseChart.update();
    
    const legendContainer = document.getElementById('chartLegend');
    const total = data.reduce((a, b) => a + b, 0);
    legendContainer.innerHTML = Object.keys(categoryTotals).map((cat, i) => `
        <div class="legend-item">
            <div class="legend-color" style="background: ${colors[i]}"></div>
            <div class="legend-info">
                <span class="legend-label">${labels[i]}</span>
                <span class="legend-value">${((data[i] / total) * 100).toFixed(1)}%</span>
            </div>
        </div>
    `).join('');
}

function updateAnalyticsCharts() {
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    
    if (monthlyChart) monthlyChart.destroy();
    
    const monthlyData = {};
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        monthlyData[month][t.type] += t.amount;
    });
    
    const months = Object.keys(monthlyData).sort();
    
    monthlyChart = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: months.map(m => {
                const [y, mo] = m.split('-');
                return new Date(y, mo - 1).toLocaleDateString('en', { month: 'short' });
            }),
            datasets: [
                { label: 'Income', data: months.map(m => monthlyData[m].income), backgroundColor: '#10b981', borderRadius: 8 },
                { label: 'Expenses', data: months.map(m => monthlyData[m].expense), backgroundColor: '#ef4444', borderRadius: 8 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#a0a0b0' } } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0b0' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0b0', callback: v => '₱' + v } }
            }
        }
    });
    
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();
    
    const catTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    
    categoryChart = new Chart(categoryCtx, {
        type: 'polarArea',
        data: {
            labels: Object.keys(catTotals).map(c => categories[c]?.label || c),
            datasets: [{
                data: Object.values(catTotals),
                backgroundColor: Object.keys(catTotals).map(c => categories[c]?.color + '80' || '#6b728080'),
                borderColor: Object.keys(catTotals).map(c => categories[c]?.color || '#6b7280'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#a0a0b0', padding: 20 } } },
            scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0b0', backdropColor: 'transparent' } } }
        }
    });
}

function init3DTilt() {
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: var(--accent-gradient);
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        font-weight: 600;
        z-index: 9999;
        animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
    }
`;
document.head.appendChild(toastStyles);

document.getElementById('theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const icon = document.querySelector('#theme-toggle i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});
