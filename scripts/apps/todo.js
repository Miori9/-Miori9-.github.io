const TodoApp = {
  storageKey: 'dreamcore-todos',
  container: null,

  launch() {
    const content = document.createElement('div');
    this.container = content;
    this.render();

    WindowManager.create('todo', 'Todo List', content, {
      width: 380,
      height: 500,
    });
  },

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch {
      return [];
    }
  },

  save(todos) {
    localStorage.setItem(this.storageKey, JSON.stringify(todos));
  },

  render() {
    if (!this.container) return;

    const todos = this.load();

    let html = `
      <div class="todo-input-wrap">
        <input class="todo-input" type="text" placeholder="Add a task..." spellcheck="false">
        <button class="todo-add-btn">+</button>
      </div>
    `;

    if (todos.length === 0) {
      html += `<div class="todo-empty">N̷̨O̶̧ ̵T̸A̵S̷K̶S̵</div>`;
    } else {
      html += '<ul class="todo-list">';
      todos.forEach((todo, i) => {
        html += `
          <li class="todo-item ${todo.done ? 'completed' : ''}">
            <input type="checkbox" class="todo-checkbox" data-index="${i}" ${todo.done ? 'checked' : ''}>
            <span class="todo-text">${this.escapeHtml(todo.text)}</span>
            <button class="todo-delete" data-index="${i}">×</button>
          </li>
        `;
      });
      html += '</ul>';
    }

    this.container.innerHTML = html;

    // Events
    const input = this.container.querySelector('.todo-input');
    const addBtn = this.container.querySelector('.todo-add-btn');

    const addTodo = () => {
      const text = input.value.trim();
      if (!text) return;
      const todos = this.load();
      todos.push({ text, done: false });
      this.save(todos);
      this.render();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTodo();
    });
    addBtn.addEventListener('click', addTodo);

    // Checkbox toggle
    this.container.querySelectorAll('.todo-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const todos = this.load();
        const idx = parseInt(cb.dataset.index);
        if (todos[idx]) {
          todos[idx].done = cb.checked;
          this.save(todos);
          this.render();
        }
      });
    });

    // Delete
    this.container.querySelectorAll('.todo-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const todos = this.load();
        const idx = parseInt(btn.dataset.index);
        todos.splice(idx, 1);
        this.save(todos);
        this.render();
      });
    });

    // Auto-focus input
    setTimeout(() => input.focus(), 50);
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  onClose() {
    this.container = null;
  },
};

window.Apps = window.Apps || {};
window.Apps.todo = TodoApp;
