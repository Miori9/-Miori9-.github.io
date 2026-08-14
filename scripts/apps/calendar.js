const CalendarApp = {
  currentDate: new Date(),
  selectedDate: null,

  launch() {
    const content = document.createElement('div');
    this.render(content);

    WindowManager.create('calendar', 'Calendar', content, {
      width: 340,
      height: 380,
    });
  },

  render(container) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();

    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];

    const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];

    // Header
    let html = `
      <div class="calendar-header">
        <button id="cal-prev">◀</button>
        <span class="calendar-month-year">${monthNames[month]} ${year}</span>
        <button id="cal-next">▶</button>
      </div>
      <div class="calendar-grid">
    `;

    // Day headers
    dayNames.forEach(d => {
      html += `<div class="calendar-day-header">${d}</div>`;
    });

    // First day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      html += `<div class="calendar-day other-month">${day}</div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isSelected = this.selectedDate &&
        d === this.selectedDate.getDate() &&
        month === this.selectedDate.getMonth() &&
        year === this.selectedDate.getFullYear();

      let cls = 'calendar-day';
      if (isToday) cls += ' today';
      if (isSelected) cls += ' selected';

      html += `<div class="${cls}" data-day="${d}">${d}</div>`;
    }

    // Next month leading days
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
      html += `<div class="calendar-day other-month">${d}</div>`;
    }

    html += '</div>';
    container.innerHTML = html;

    // Events
    container.querySelector('#cal-prev').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render(container);
    });

    container.querySelector('#cal-next').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render(container);
    });

    container.querySelectorAll('.calendar-day:not(.other-month)').forEach(el => {
      el.addEventListener('click', () => {
        const day = parseInt(el.dataset.day);
        this.selectedDate = new Date(year, month, day);
        this.render(container);
      });
    });
  },

  onClose() {
    // Reset to current month on close
    this.currentDate = new Date();
    this.selectedDate = null;
  },
};

window.Apps = window.Apps || {};
window.Apps.calendar = CalendarApp;
