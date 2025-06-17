// Configuração da API
const API_BASE_URL = 'https://ugsbrasil.com.br/api';

// Estado global da aplicação
let currentUser = null;
let currentScreen = 'login';

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    showScreen('loginScreen');
    
    // Definir data atual nos campos de data
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
}

function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('adminLogoutBtn').addEventListener('click', handleLogout);
    
    // Navegação por abas
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Funcionário - Postagens
    document.getElementById('addPostBtn').addEventListener('click', showPostForm);
    document.getElementById('cancelPostBtn').addEventListener('click', hidePostForm);
    document.getElementById('postFormElement').addEventListener('submit', handlePostSubmit);
    
    // Funcionário - Compartilhamentos
    document.getElementById('addShareBtn').addEventListener('click', showShareForm);
    document.getElementById('cancelShareBtn').addEventListener('click', hideShareForm);
    document.getElementById('shareFormElement').addEventListener('submit', handleShareSubmit);
    
    // Funcionário - Relatórios
    document.getElementById('generateReportBtn').addEventListener('click', generateEmployeeReport);
    
    // Admin - Usuários
    document.getElementById('addUserBtn').addEventListener('click', showUserForm);
    document.getElementById('cancelUserBtn').addEventListener('click', hideUserForm);
    document.getElementById('userFormElement').addEventListener('submit', handleUserSubmit);
    
    // Admin - Metas
    document.getElementById('addGoalBtn').addEventListener('click', showGoalForm);
    document.getElementById('cancelGoalBtn').addEventListener('click', hideGoalForm);
    document.getElementById('goalFormElement').addEventListener('submit', handleGoalSubmit);
    
    // Admin - Relatórios
    document.getElementById('generateAdminReportBtn').addEventListener('click', generateAdminReport);
}

// Funções de navegação
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
}

function switchTab(tabName) {
    // Atualizar abas de navegação
    const parentScreen = document.querySelector('.screen.active');
    parentScreen.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    parentScreen.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Atualizar conteúdo das abas
    parentScreen.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    parentScreen.querySelector(`#${tabName}Tab`).classList.add('active');
    
    // Carregar dados específicos da aba
    loadTabData(tabName);
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'posts':
            loadPosts();
            break;
        case 'shares':
            loadShares();
            loadAvailablePosts();
            break;
        case 'goals':
            loadGoals();
            break;
        case 'reports':
            // Relatórios são carregados sob demanda
            break;
        case 'users':
            loadUsers();
            break;
        case 'adminGoals':
            loadAdminGoals();
            loadUsersForGoals();
            break;
        case 'adminReports':
            loadUsersForReports();
            break;
        case 'ranking':
            loadRanking();
            break;
    }
}

// Funções de autenticação
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            
            if (data.user.role === 'admin') {
                document.getElementById('adminUsername').textContent = data.user.username;
                showScreen('adminScreen');
                loadTabData('users');
            } else {
                document.getElementById('employeeUsername').textContent = data.user.username;
                showScreen('employeeScreen');
                loadTabData('posts');
            }
            
            // Limpar formulário
            document.getElementById('loginForm').reset();
            hideError('loginError');
        } else {
            showError('loginError', data.error);
        }
    } catch (error) {
        showError('loginError', 'Erro de conexão com o servidor');
    }
}

function handleLogout() {
    currentUser = null;
    showScreen('loginScreen');
    
    // Limpar dados
    document.querySelectorAll('.tab-content').forEach(content => {
        content.innerHTML = '';
    });
}

// Funções de postagens
async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts.php`);
        const posts = await response.json();
        
        const postsList = document.getElementById('postsList');
        
        if (posts.length === 0) {
            postsList.innerHTML = '<p class="loading">Nenhuma postagem encontrada.</p>';
            return;
        }
        
        postsList.innerHTML = posts.map(post => `
            <div class="post-item">
                <div class="post-header">
                    <div class="post-meta">
                        ${formatDate(post.post_date)} - ${post.type === 'post' ? 'Postagem' : 'Compartilhamento'}
                        ${post.username ? ` por ${post.username}` : ''}
                    </div>
                    <div class="post-actions">
                        <button class="btn btn-edit" onclick="editPost(${post.id})">Editar</button>
                        <button class="btn btn-danger" onclick="deletePost(${post.id})">Excluir</button>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.type === 'share' ? `<div class="post-meta">Compartilhamentos: ${post.shares_count}</div>` : ''}
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('postsList').innerHTML = '<p class="loading">Erro ao carregar postagens.</p>';
    }
}

function showPostForm(post = null) {
    const form = document.getElementById('postForm');
    const title = document.getElementById('postFormTitle');
    
    if (post) {
        title.textContent = 'Editar Postagem';
        document.getElementById('postId').value = post.id;
        document.getElementById('postContent').value = post.content;
        document.getElementById('postDate').value = post.post_date;
    } else {
        title.textContent = 'Nova Postagem';
        document.getElementById('postFormElement').reset();
        document.getElementById('postId').value = '';
        document.getElementById('postDate').value = new Date().toISOString().split('T')[0];
    }
    
    form.classList.remove('hidden');
}

function hidePostForm() {
    document.getElementById('postForm').classList.add('hidden');
}

async function handlePostSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const postId = document.getElementById('postId').value;
    
    const data = {
        content: formData.get('content'),
        post_date: formData.get('post_date'),
        type: 'post'
    };
    
    if (postId) {
        data.id = postId;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/posts.php`, {
            method: postId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            hidePostForm();
            loadPosts();
        } else {
            alert('Erro: ' + result.error);
        }
    } catch (error) {
        alert('Erro de conexão com o servidor');
    }
}

async function editPost(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/posts.php`);
        const posts = await response.json();
        const post = posts.find(p => p.id == id);
        
        if (post) {
            showPostForm(post);
        }
    } catch (error) {
        alert('Erro ao carregar dados da postagem');
    }
}

async function deletePost(id) {
    if (confirm('Tem certeza que deseja excluir esta postagem?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/posts.php?id=${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                loadPosts();
            } else {
                alert('Erro: ' + result.error);
            }
        } catch (error) {
            alert('Erro de conexão com o servidor');
        }
    }
}

// Funções de compartilhamentos
async function loadShares() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts.php`);
        const posts = await response.json();
        const shares = posts.filter(post => post.type === 'share');
        
        const sharesList = document.getElementById('sharesList');
        
        if (shares.length === 0) {
            sharesList.innerHTML = '<p class="loading">Nenhum compartilhamento encontrado.</p>';
            return;
        }
        
        sharesList.innerHTML = shares.map(share => `
            <div class="post-item">
                <div class="post-header">
                    <div class="post-meta">
                        ${formatDate(share.post_date)} - Compartilhamento
                        ${share.username ? ` por ${share.username}` : ''}
                    </div>
                    <div class="post-actions">
                        <button class="btn btn-danger" onclick="deletePost(${share.id})">Excluir</button>
                    </div>
                </div>
                <div class="post-content">${share.content}</div>
                <div class="post-meta">Compartilhamentos: ${share.shares_count}</div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('sharesList').innerHTML = '<p class="loading">Erro ao carregar compartilhamentos.</p>';
    }
}

async function loadAvailablePosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/shares.php`);
        const posts = await response.json();
        
        const select = document.getElementById('originalPost');
        select.innerHTML = '<option value="">Selecione uma postagem</option>';
        
        posts.forEach(post => {
            const option = document.createElement('option');
            option.value = post.id;
            option.textContent = `${post.username}: ${post.content.substring(0, 50)}...`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar postagens disponíveis:', error);
    }
}

function showShareForm() {
    const form = document.getElementById('shareForm');
    document.getElementById('shareFormElement').reset();
    document.getElementById('shareDate').value = new Date().toISOString().split('T')[0];
    form.classList.remove('hidden');
}

function hideShareForm() {
    document.getElementById('shareForm').classList.add('hidden');
}

async function handleShareSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    const data = {
        original_post_id: formData.get('original_post_id'),
        shares_count: parseInt(formData.get('shares_count')),
        post_date: formData.get('post_date')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/shares.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideShareForm();
            loadShares();
        } else {
            alert('Erro: ' + result.error);
        }
    } catch (error) {
        alert('Erro de conexão com o servidor');
    }
}

// Funções de metas
async function loadGoals() {
    try {
        const response = await fetch(`${API_BASE_URL}/goals.php`);
        const goals = await response.json();
        
        const goalsCarousel = document.getElementById('goalsCarousel');
        
        if (goals.length === 0) {
            goalsCarousel.innerHTML = '<p class="loading">Nenhuma meta encontrada.</p>';
            return;
        }
        
        // Buscar dados de progresso
        const reportsResponse = await fetch(`${API_BASE_URL}/reports.php?period=daily`);
        const reportsData = await reportsResponse.json();
        const userReport = reportsData.reports[0] || { total_posts: 0, posts_count: 0, shares_count: 0 };
        
        goalsCarousel.innerHTML = goals.map(goal => {
            const progress = calculateGoalProgress(goal, userReport);
            const progressPercentage = Math.min((progress / goal.target_value) * 100, 100);
            
            return `
                <div class="goal-card">
                    <h3>Meta ${goal.goal_type === 'daily' ? 'Diária' : goal.goal_type === 'weekly' ? 'Semanal' : 'Mensal'}</h3>
                    <p>Objetivo: ${goal.target_value} postagens</p>
                    <p>Período: ${formatDate(goal.start_date)} - ${formatDate(goal.end_date)}</p>
                    ${goal.username ? `<p>Usuário: ${goal.username}</p>` : '<p>Meta Coletiva</p>'}
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                        <div class="progress-text">${progress} / ${goal.target_value} (${progressPercentage.toFixed(1)}%)</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        document.getElementById('goalsCarousel').innerHTML = '<p class="loading">Erro ao carregar metas.</p>';
    }
}

function calculateGoalProgress(goal, userReport) {
    // Simplificação: usar total_posts para todas as metas
    return userReport.total_posts || 0;
}

// Funções de relatórios
async function generateEmployeeReport() {
    const period = document.getElementById('reportPeriod').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/reports.php?period=${period}`);
        const data = await response.json();
        
        const reportContent = document.getElementById('reportContent');
        const userReport = data.reports[0] || { total_posts: 0, posts_count: 0, shares_count: 0 };
        
        reportContent.innerHTML = `
            <h3>Relatório ${period === 'daily' ? 'Diário' : period === 'weekly' ? 'Semanal' : 'Mensal'}</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                <div class="stat-card">
                    <h4>Total de Postagens</h4>
                    <p style="font-size: 2rem; color: #667eea; font-weight: bold;">${userReport.total_posts}</p>
                </div>
                <div class="stat-card">
                    <h4>Postagens Originais</h4>
                    <p style="font-size: 2rem; color: #667eea; font-weight: bold;">${userReport.posts_count}</p>
                </div>
                <div class="stat-card">
                    <h4>Compartilhamentos</h4>
                    <p style="font-size: 2rem; color: #667eea; font-weight: bold;">${userReport.shares_count}</p>
                </div>
            </div>
        `;
    } catch (error) {
        document.getElementById('reportContent').innerHTML = '<p class="loading">Erro ao gerar relatório.</p>';
    }
}

// Funções de administração - Usuários
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users.php`);
        const users = await response.json();
        
        const usersList = document.getElementById('usersList');
        
        if (users.length === 0) {
            usersList.innerHTML = '<p class="loading">Nenhum usuário encontrado.</p>';
            return;
        }
        
        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-header">
                    <div>
                        <h4>${user.username}</h4>
                        <div class="user-meta">${user.role === 'admin' ? 'Administrador' : 'Funcionário'}</div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-edit" onclick="editUser(${user.id})">Editar</button>
                        <button class="btn btn-danger" onclick="deleteUser(${user.id})">Excluir</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('usersList').innerHTML = '<p class="loading">Erro ao carregar usuários.</p>';
    }
}

function showUserForm(user = null) {
    const form = document.getElementById('userForm');
    const title = document.getElementById('userFormTitle');
    const passwordField = document.getElementById('userPassword');
    
    if (user) {
        title.textContent = 'Editar Usuário';
        document.getElementById('userId').value = user.id;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userRole').value = user.role;
        passwordField.placeholder = 'Deixe em branco para manter a senha atual';
        passwordField.required = false;
    } else {
        title.textContent = 'Novo Usuário';
        document.getElementById('userFormElement').reset();
        document.getElementById('userId').value = '';
        passwordField.placeholder = '';
        passwordField.required = true;
    }
    
    form.classList.remove('hidden');
}

function hideUserForm() {
    document.getElementById('userForm').classList.add('hidden');
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userId = document.getElementById('userId').value;
    
    const data = {
        username: formData.get('username'),
        role: formData.get('role')
    };
    
    const password = formData.get('password');
    if (password) {
        data.password = password;
    }
    
    if (userId) {
        data.id = userId;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users.php`, {
            method: userId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideUserForm();
            loadUsers();
        } else {
            alert('Erro: ' + result.error);
        }
    } catch (error) {
        alert('Erro de conexão com o servidor');
    }
}

async function editUser(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/users.php`);
        const users = await response.json();
        const user = users.find(u => u.id == id);
        
        if (user) {
            showUserForm(user);
        }
    } catch (error) {
        alert('Erro ao carregar dados do usuário');
    }
}

async function deleteUser(id) {
    if (confirm('Tem certeza que deseja excluir este usuário? Todas as postagens e metas relacionadas também serão excluídas.')) {
        try {
            const response = await fetch(`${API_BASE_URL}/users.php?id=${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                loadUsers();
            } else {
                alert('Erro: ' + result.error);
            }
        } catch (error) {
            alert('Erro de conexão com o servidor');
        }
    }
}

// Funções de administração - Metas
async function loadAdminGoals() {
    try {
        const response = await fetch(`${API_BASE_URL}/goals.php`);
        const goals = await response.json();
        
        const goalsList = document.getElementById('goalsList');
        
        if (goals.length === 0) {
            goalsList.innerHTML = '<p class="loading">Nenhuma meta encontrada.</p>';
            return;
        }
        
        goalsList.innerHTML = goals.map(goal => `
            <div class="goal-item">
                <div class="goal-header">
                    <div>
                        <h4>Meta ${goal.goal_type === 'daily' ? 'Diária' : goal.goal_type === 'weekly' ? 'Semanal' : 'Mensal'}</h4>
                        <div class="goal-meta">
                            ${goal.username ? `Usuário: ${goal.username}` : 'Meta Coletiva'} - 
                            Objetivo: ${goal.target_value} - 
                            ${formatDate(goal.start_date)} a ${formatDate(goal.end_date)}
                        </div>
                    </div>
                    <div class="goal-actions">
                        <button class="btn btn-edit" onclick="editGoal(${goal.id})">Editar</button>
                        <button class="btn btn-danger" onclick="deleteGoal(${goal.id})">Excluir</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('goalsList').innerHTML = '<p class="loading">Erro ao carregar metas.</p>';
    }
}

async function loadUsersForGoals() {
    try {
        const response = await fetch(`${API_BASE_URL}/users.php`);
        const users = await response.json();
        
        const select = document.getElementById('goalUser');
        select.innerHTML = '<option value="">Meta Coletiva</option>';
        
        users.filter(user => user.role === 'employee').forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários para metas:', error);
    }
}

function showGoalForm(goal = null) {
    const form = document.getElementById('goalForm');
    const title = document.getElementById('goalFormTitle');
    
    if (goal) {
        title.textContent = 'Editar Meta';
        document.getElementById('goalId').value = goal.id;
        document.getElementById('goalUser').value = goal.user_id || '';
        document.getElementById('goalType').value = goal.goal_type;
        document.getElementById('goalTarget').value = goal.target_value;
        document.getElementById('goalStartDate').value = goal.start_date;
        document.getElementById('goalEndDate').value = goal.end_date;
    } else {
        title.textContent = 'Nova Meta';
        document.getElementById('goalFormElement').reset();
        document.getElementById('goalId').value = '';
    }
    
    form.classList.remove('hidden');
}

function hideGoalForm() {
    document.getElementById('goalForm').classList.add('hidden');
}

async function handleGoalSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const goalId = document.getElementById('goalId').value;
    
    const data = {
        user_id: formData.get('user_id') || null,
        goal_type: formData.get('goal_type'),
        target_value: parseInt(formData.get('target_value')),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date')
    };
    
    if (goalId) {
        data.id = goalId;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/goals.php`, {
            method: goalId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideGoalForm();
            loadAdminGoals();
        } else {
            alert('Erro: ' + result.error);
        }
    } catch (error) {
        alert('Erro de conexão com o servidor');
    }
}

async function editGoal(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/goals.php`);
        const goals = await response.json();
        const goal = goals.find(g => g.id == id);
        
        if (goal) {
            showGoalForm(goal);
        }
    } catch (error) {
        alert('Erro ao carregar dados da meta');
    }
}

async function deleteGoal(id) {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/goals.php?id=${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                loadAdminGoals();
            } else {
                alert('Erro: ' + result.error);
            }
        } catch (error) {
            alert('Erro de conexão com o servidor');
        }
    }
}

// Funções de administração - Relatórios
async function loadUsersForReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/users.php`);
        const users = await response.json();
        
        const select = document.getElementById('adminReportUser');
        select.innerHTML = '<option value="">Todos os usuários</option>';
        
        users.filter(user => user.role === 'employee').forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários para relatórios:', error);
    }
}

async function generateAdminReport() {
    const period = document.getElementById('adminReportPeriod').value;
    const userId = document.getElementById('adminReportUser').value;
    
    try {
        let url = `${API_BASE_URL}/reports.php?period=${period}`;
        if (userId) {
            url += `&user_id=${userId}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        const reportContent = document.getElementById('adminReportContent');
        
        if (data.reports.length === 0) {
            reportContent.innerHTML = '<p class="loading">Nenhum dado encontrado para o período selecionado.</p>';
            return;
        }
        
        let html = `<h3>Relatório ${period === 'daily' ? 'Diário' : period === 'weekly' ? 'Semanal' : 'Mensal'}</h3>`;
        
        if (userId) {
            const report = data.reports[0];
            html += `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div class="stat-card">
                        <h4>Total de Postagens</h4>
                        <p style="font-size: 2rem; color: #667eea; font-weight: bold;">${report.total_posts}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Postagens Originais</h4>
                        <p style="font-size: 2rem; color: #667eea; font-weight: bold;">${report.posts_count}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Compartilhamentos</h4>
                        <p style="font-size: 2rem; color: #667eea; font-weight: bold;">${report.shares_count}</p>
                    </div>
                </div>
            `;
        } else {
            html += '<div style="margin-top: 20px;">';
            data.reports.forEach(report => {
                html += `
                    <div class="user-item" style="margin-bottom: 15px;">
                        <h4>${report.username}</h4>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 10px;">
                            <div>Total: ${report.total_posts}</div>
                            <div>Postagens: ${report.posts_count}</div>
                            <div>Compartilhamentos: ${report.shares_count}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        reportContent.innerHTML = html;
    } catch (error) {
        document.getElementById('adminReportContent').innerHTML = '<p class="loading">Erro ao gerar relatório.</p>';
    }
}

// Funções de ranking
async function loadRanking() {
    try {
        const response = await fetch(`${API_BASE_URL}/reports.php?period=monthly`);
        const data = await response.json();
        
        const rankingContent = document.getElementById('rankingContent');
        
        if (data.reports.length === 0) {
            rankingContent.innerHTML = '<p class="loading">Nenhum dado encontrado.</p>';
            return;
        }
        
        // Ordenar por total de postagens
        const sortedReports = data.reports.sort((a, b) => b.total_posts - a.total_posts);
        
        rankingContent.innerHTML = sortedReports.map((report, index) => `
            <div class="ranking-item">
                <div class="ranking-position">${index + 1}º</div>
                <div class="ranking-user">${report.username}</div>
                <div class="ranking-stats">
                    <div>Total: ${report.total_posts}</div>
                    <div>Postagens: ${report.posts_count}</div>
                    <div>Compartilhamentos: ${report.shares_count}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('rankingContent').innerHTML = '<p class="loading">Erro ao carregar ranking.</p>';
    }
}

// Funções utilitárias
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.classList.remove('show');
}

