document.addEventListener('DOMContentLoaded', () => {
  injectNotificationStyles();
  createNotificationContainer();
  setupPage();
});

// ---------- Utilitários de Notificação (mesmo código) ----------
function injectNotificationStyles() {
  if (document.getElementById('notif-styles')) return;
  const style = document.createElement('style');
  style.id = 'notif-styles';
  style.textContent = `
    .notification-container {
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .notification {
      padding: 15px 20px; border-radius: 8px; color: #fff;
      font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease; min-width: 250px;
    }
    .notification-success { background-color: var(--success, #27ae60); }
    .notification-error { background-color: var(--danger, #e74c3c); }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

function createNotificationContainer() {
  if (document.getElementById('notification-container')) return;
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.className = 'notification-container';
  document.body.appendChild(container);
}

function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-container');
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  container.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// ---------- Gerenciamento de Tarefas ----------
class TaskManager {
  static storageKey = 'gerenciador_tarefas';
  
  static getAll() {
    return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  }
  
  static saveAll(tasks) {
    localStorage.setItem(this.storageKey, JSON.stringify(tasks));
  }
  
  static add(task) {
    const tasks = this.getAll();
    task.id = Date.now();  // ID único baseado no timestamp
    task.status = task.status || 'pendente';
    task.createdAt = new Date().toISOString();
    tasks.push(task);
    this.saveAll(tasks);
    return task;
  }
  
  static update(id, updatedData) {
    const tasks = this.getAll();
    const index = tasks.findIndex(t => t.id == id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updatedData };
      this.saveAll(tasks);
      return tasks[index];
    }
    return null;
  }
  
  static delete(id) {
    let tasks = this.getAll();
    tasks = tasks.filter(t => t.id != id);
    this.saveAll(tasks);
  }
  
  static getById(id) {
    return this.getAll().find(t => t.id == id);
  }
}

// ---------- Identificação de Página e Configuração ----------
function isLoginPage() { return document.querySelector('.auth-card') && document.getElementById('email') && !document.getElementById('name'); }
function isRegisterPage() { return document.querySelector('.auth-card') && document.getElementById('name'); }
function isDashboardPage() { return !!document.getElementById('tasksGrid'); }
function isCreateTaskPage() { return document.querySelector('.task-details-card form') && !document.getElementById('editTaskContainer'); }
function isEditTaskPage() { return !!document.getElementById('editTaskContainer'); }
function isTaskDetailsPage() { return !!document.getElementById('taskDetailContainer'); }

function setupPage() {
  if (isLoginPage()) setupLogin();
  else if (isRegisterPage()) setupRegister();
  else if (isDashboardPage()) renderDashboard();
  else if (isCreateTaskPage()) setupCreateTask();
  else if (isEditTaskPage()) setupEditTask();
  else if (isTaskDetailsPage()) setupTaskDetails();
}

// ---------- Validações ----------
function validateLogin(email, password) {
  if (!email.trim()) return 'O campo Email é obrigatório.';
  if (!password) return 'O campo Senha é obrigatório.';
  return null;
}

function validateRegister(name, email, password) {
  const trimmedName = name.trim();
  if (trimmedName.length < 5) return 'O Nome deve ter pelo menos 5 posições.';
  if (!trimmedName.includes(' ')) return 'O Nome deve conter um espaço entre nome e sobrenome.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.com(\.br)?$/i;
  if (!emailRegex.test(email.trim())) return 'Formato de Email inválido (ex: nome@domínio.com ou nome@domínio.com.br).';
  if (password.length < 8) return 'A Senha deve ter pelo menos 8 posições.';
  return null;
}

function validateTaskForm(title, description) {
  if (title.trim().length < 5) return 'O Título deve ter pelo menos 5 posições.';
  const descTrimmed = description.trim();
  if (descTrimmed && descTrimmed.length < 3) return 'A Descrição, se preenchida, deve ter pelo menos 3 posições.';
  return null;
}

// ---------- Renderização ----------
function renderDashboard() {
  const grid = document.getElementById('tasksGrid');
  const noMsg = document.getElementById('noTasksMessage');
  if (!grid) return;
  
  const tasks = TaskManager.getAll().sort((a,b) => b.id - a.id); // mais recentes primeiro
  
  if (tasks.length === 0) {
    if (noMsg) noMsg.style.display = 'block';
    grid.innerHTML = '';
    return;
  }
  
  if (noMsg) noMsg.style.display = 'none';
  
  grid.innerHTML = tasks.map(task => `
    <div class="task-card" data-id="${task.id}">
      <h3><a href="task-details.html?id=${task.id}" style="text-decoration: none; color: var(--secondary);">${escapeHtml(task.title)}</a></h3>
      <p>${escapeHtml(task.description || 'Sem descrição')}</p>
      <div class="task-actions">
        <a href="task-details.html?id=${task.id}" class="btn btn-secondary btn-sm">Detalhes</a>
        <button class="btn btn-success btn-sm complete-btn" data-id="${task.id}">${task.status === 'concluido' ? 'Reabrir' : 'Concluir'}</button>
      </div>
    </div>
  `).join('');
  
  // Event listeners nos botões de concluir
  document.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      const task = TaskManager.getById(id);
      if (task) {
        const newStatus = task.status === 'concluido' ? 'pendente' : 'concluido';
        TaskManager.update(id, { status: newStatus });
        showNotification(newStatus === 'concluido' ? 'Tarefa concluída!' : 'Tarefa reaberta!');
        renderDashboard(); // re‑renderiza para atualizar o texto do botão
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Página de Detalhes ----------
function setupTaskDetails() {
  const container = document.getElementById('taskDetailContainer');
  if (!container) return;
  
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    container.innerHTML = '<p>Tarefa não encontrada.</p>';
    return;
  }
  
  const task = TaskManager.getById(id);
  if (!task) {
    container.innerHTML = '<p>Tarefa não encontrada.</p>';
    return;
  }
  
  container.innerHTML = `
    <div class="task-details-card">
      <h2>${escapeHtml(task.title)}</h2>
      <div class="task-meta">
        <strong>Status:</strong> ${task.status === 'concluido' ? 'Concluído' : (task.status === 'em_andamento' ? 'Em andamento' : 'Pendente')}<br>
        <strong>Criada em:</strong> ${new Date(task.createdAt).toLocaleDateString('pt-BR')}
      </div>
      <div class="task-description">
        <strong>Descrição:</strong>
        <p>${escapeHtml(task.description || 'Nenhuma descrição fornecida.')}</p>
      </div>
      <div style="display: flex; gap: 1rem; margin-top: 2rem;">
        <a href="edit-task.html?id=${task.id}" class="btn btn-primary">Editar Tarefa</a>
        <button class="btn btn-danger" id="deleteTaskBtn">Excluir Tarefa</button>
        <a href="dashboard.html" class="btn btn-secondary">Voltar</a>
      </div>
    </div>
  `;
  
  document.getElementById('deleteTaskBtn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      TaskManager.delete(task.id);
      showNotification('Tarefa excluída com sucesso!');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    }
  });
}

// ---------- Página de Edição ----------
function setupEditTask() {
  const container = document.getElementById('editTaskContainer');
  if (!container) return;
  
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    container.innerHTML = '<p>Tarefa não encontrada.</p>';
    return;
  }
  
  const task = TaskManager.getById(id);
  if (!task) {
    container.innerHTML = '<p>Tarefa não encontrada.</p>';
    return;
  }
  
  container.innerHTML = `
    <div class="task-details-card">
      <form id="editTaskForm">
        <div class="form-group">
          <label for="title">Título da Tarefa</label>
          <input type="text" id="title" name="title" value="${escapeHtml(task.title)}" required>
        </div>
        <div class="form-group">
          <label for="description">Descrição</label>
          <textarea id="description" name="description">${escapeHtml(task.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="status">Status</label>
          <select id="status" name="status">
            <option value="pendente" ${task.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="em_andamento" ${task.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
            <option value="concluido" ${task.status === 'concluido' ? 'selected' : ''}>Concluído</option>
          </select>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end; flex-wrap: wrap;">
          <button type="submit" class="btn btn-primary">Salvar Alterações</button>
          <a href="dashboard.html" class="btn btn-secondary">Cancelar</a>
          <button type="button" class="btn btn-danger" id="deleteFromEditBtn">Excluir Tarefa</button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('editTaskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const status = document.getElementById('status').value;
    
    const error = validateTaskForm(title, description);
    if (error) {
      showNotification(error, 'error');
      return;
    }
    
    TaskManager.update(id, { title: title.trim(), description: description.trim(), status });
    showNotification('Tarefa alterada com sucesso!');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  });
  
  document.getElementById('deleteFromEditBtn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      TaskManager.delete(id);
      showNotification('Tarefa excluída com sucesso!');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    }
  });
}

// ---------- Criação de Tarefa ----------
function setupCreateTask() {
  const form = document.querySelector('.task-details-card form');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    
    const error = validateTaskForm(title, description);
    if (error) {
      showNotification(error, 'error');
      return;
    }
    
    TaskManager.add({
      title: title.trim(),
      description: description.trim(),
      status: 'pendente'
    });
    
    showNotification('Tarefa criada com sucesso!');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  });
}

// ---------- Login e Cadastro (inalterados) ----------
function setupLogin() {
  const form = document.querySelector('.auth-card form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const error = validateLogin(email, password);
    if (error) {
      showNotification(error, 'error');
      return;
    }
    showNotification('Login realizado com sucesso!');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  });
}

function setupRegister() {
  const form = document.querySelector('.auth-card form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const error = validateRegister(name, email, password);
    if (error) {
      showNotification(error, 'error');
      return;
    }
    showNotification('Cadastro realizado com sucesso!');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  });
}