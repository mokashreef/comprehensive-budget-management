class BudgetApp {
    constructor() {
        this.transactions = [];
        this.budgets = [];
        this.categories = {
            food: { name: '🍔 طعام', color: '#e74c3c' },
            transport: { name: '🚕 نقل', color: '#3498db' },
            shopping: { name: '🛍️ تسوق', color: '#9b59b6' },
            entertainment: { name: '🎬 ترفيه', color: '#f39c12' },
            health: { name: '🏥 صحة', color: '#e67e22' },
            education: { name: '📚 تعليم', color: '#1abc9c' },
            bills: { name: '💡 فواتير', color: '#34495e' },
            other: { name: '📦 أخرى', color: '#95a5a6' }
        };

        this.charts = {};
        this.currentMonth = new Date().toISOString().slice(0, 7);

        this.currencies = {
            'USD': { locale: 'en-US', symbol: '$', suffix: false },
            'SYP': { locale: 'ar-SY', symbol: 'ل.س', suffix: true },
            'SAR': { locale: 'ar-SA', symbol: 'ر.س', suffix: true },
            'AED': { locale: 'ar-AE', symbol: 'د.إ', suffix: true },
            'EGP': { locale: 'ar-EG', symbol: 'ج.م', suffix: true },
            'EUR': { locale: 'en-IE', symbol: '€', suffix: false }
        };
        this.currentCurrency = localStorage.getItem('budgetCurrency') || 'USD';

        this.init();
    }

    init() {
        this.initializeElements();
        this.loadData();
        this.setupEventListeners();
        this.updateDashboard();
        this.initializeCharts();
    }

    initializeElements() {
        this.modals = {
            income: document.getElementById('incomeModal'),
            expense: document.getElementById('expenseModal'),
            budget: document.getElementById('budgetModal')
        };

        this.forms = {
            income: document.getElementById('incomeForm'),
            expense: document.getElementById('expenseForm'),
            budget: document.getElementById('budgetForm')
        };

        this.buttons = {
            addIncome: document.getElementById('addIncomeBtn'),
            addExpense: document.getElementById('addExpenseBtn'),
            setBudget: document.getElementById('setBudgetBtn'),
            themeToggle: document.getElementById('themeToggle'),
            exportData: document.getElementById('exportData'),
            importData: document.getElementById('importData')
        };

        this.selectors = {
            currencySelector: document.getElementById('currencySelector'),
            chartPeriod: document.getElementById('chartPeriod'),
            transactionType: document.getElementById('transactionTypeFilter'),
            transactionCategory: document.getElementById('transactionCategoryFilter')
        };

        this.displayElements = {
            transactionsList: document.getElementById('transactionsList'),
            importFile: document.getElementById('importFile')
        };

        if (this.selectors.currencySelector) {
            this.selectors.currencySelector.value = this.currentCurrency;
        }

        this.setDefaultDates();
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const dateFields = ['incomeDate', 'expenseDate', 'budgetMonth'];
        dateFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = id === 'budgetMonth' ? this.currentMonth : today;
            }
        });
    }

    setupEventListeners() {
        this.buttons.addIncome.addEventListener('click', () => this.showModal('income'));
        this.buttons.addExpense.addEventListener('click', () => this.showModal('expense'));
        this.buttons.setBudget.addEventListener('click', () => this.showModal('budget'));

        this.forms.income.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction('income');
        });

        this.forms.expense.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction('expense');
        });

        this.forms.budget.addEventListener('submit', (e) => {
            e.preventDefault();
            this.setBudget();
        });

        this.setupModalListeners();
        this.buttons.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        if (this.selectors.currencySelector) {
            this.selectors.currencySelector.addEventListener('change', (e) => this.changeCurrency(e.target.value));
        }

        this.buttons.exportData.addEventListener('click', () => this.exportDataToFile());
        this.buttons.importData.addEventListener('click', () => this.displayElements.importFile.click());
        this.displayElements.importFile.addEventListener('change', (e) => this.importDataFromFile(e));

        this.selectors.chartPeriod.addEventListener('change', () => this.updateCharts());
        this.selectors.transactionType.addEventListener('change', () => {
            this.updateTransactionsList();
            this.updateCategoryFilter();
        });
        this.selectors.transactionCategory.addEventListener('change', () => this.updateTransactionsList());
    }

    setupModalListeners() {
        document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.hideModal(modal);
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal);
            });
        });
    }

    addTransaction(type) {
        try {
            const form = this.forms[type];
            const amount = this.getFormValue(`${type}Amount`);
            const date = this.getFormValue(`${type}Date`);
            const description = this.getFormValue(`${type}Description`);

            if (!this.validateAmount(amount)) {
                this.showNotification('الرجاء إدخال مبلغ صحيح', 'error');
                return;
            }

            const transaction = {
                id: Date.now().toString(),
                type,
                amount,
                date,
                description,
                createdAt: new Date().toISOString()
            };

            if (type === 'income') {
                transaction.source = this.getFormValue('incomeSource');
            } else {
                transaction.category = this.getFormValue('expenseCategory');
            }

            this.transactions.unshift(transaction);
            this.saveData();
            this.updateDashboard();
            this.hideModal(this.modals[type]);
            form.reset();
            this.setDefaultDates();

            this.showNotification(`تم إضافة ${type === 'income' ? 'الدخل' : 'المصروف'} بنجاح`, 'success');
            this.checkBudgetAlert();
        } catch (error) {
            console.error('Error adding transaction:', error);
            this.showNotification('حدث خطأ أثناء إضافة العملية', 'error');
        }
    }

    setBudget() {
        try {
            const amount = this.getFormValue('budgetAmount');
            const month = this.getFormValue('budgetMonth');
            const alertEnabled = document.getElementById('budgetAlert').checked;

            if (!this.validateAmount(amount)) {
                this.showNotification('الرجاء إدخال مبلغ صحيح', 'error');
                return;
            }

            const budget = {
                id: Date.now().toString(),
                amount,
                month,
                alertEnabled,
                createdAt: new Date().toISOString()
            };

            this.budgets = this.budgets.filter(b => b.month !== month);
            this.budgets.push(budget);

            this.saveData();
            this.updateDashboard();
            this.hideModal(this.modals.budget);
            this.forms.budget.reset();

            this.showNotification('تم تعيين الميزانية بنجاح', 'success');
        } catch (error) {
            console.error('Error setting budget:', error);
            this.showNotification('حدث خطأ أثناء تعيين الميزانية', 'error');
        }
    }

    deleteTransaction(transactionId) {
        if (!confirm('هل أنت متأكد من حذف هذه العملية؟')) return;

        this.transactions = this.transactions.filter(t => t.id !== transactionId);
        this.saveData();
        this.updateDashboard();
        this.showNotification('تم حذف العملية بنجاح', 'success');
    }

    editTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        const isIncome = transaction.type === 'income';
        const prefix = transaction.type;
        const type = transaction.type;

        document.getElementById(`${prefix}Amount`).value = transaction.amount;
        document.getElementById(`${prefix}Date`).value = transaction.date;
        document.getElementById(`${prefix}Description`).value = transaction.description || '';

        if (isIncome) {
            document.getElementById('incomeSource').value = transaction.source;
        } else {
            document.getElementById('expenseCategory').value = transaction.category;
        }

        this.showModal(type);
        this.deleteTransaction(transactionId);
    }

    updateDashboard() {
        this.updateSummary();
        this.updateTransactionsList();
        this.updateCharts();
    }

    updateSummary() {
        const currentMonthTransactions = this.getCurrentMonthTransactions();

        const totalIncome = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = currentMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIncome - totalExpense;

        document.getElementById('totalIncome').textContent = this.formatCurrency(totalIncome);
        document.getElementById('totalExpense').textContent = this.formatCurrency(totalExpense);
        document.getElementById('remainingBalance').textContent = this.formatCurrency(balance);

        this.updateBudgetProgress(totalExpense);
    }

    updateBudgetProgress(totalExpense) {
        const currentBudget = this.budgets.find(b => b.month === this.currentMonth);
        const budgetProgress = document.getElementById('budgetProgressFill');
        const budgetProgressText = document.getElementById('budgetProgressText');
        const monthlyBudgetElement = document.getElementById('monthlyBudget');

        if (currentBudget) {
            const progress = (totalExpense / currentBudget.amount) * 100;
            const displayProgress = Math.min(progress, 100);

            budgetProgress.style.width = `${displayProgress}%`;
            budgetProgressText.textContent = `${displayProgress.toFixed(1)}%`;
            monthlyBudgetElement.textContent = this.formatCurrency(currentBudget.amount);

            if (displayProgress >= 100) {
                budgetProgress.style.background = 'var(--accent-color)';
            } else if (displayProgress >= 80) {
                budgetProgress.style.background = 'var(--warning-color)';
            } else {
                budgetProgress.style.background = 'linear-gradient(90deg, var(--primary-color), var(--primary-dark))';
            }
        } else {
            budgetProgress.style.width = '0%';
            budgetProgressText.textContent = '0%';
            monthlyBudgetElement.textContent = this.formatCurrency(0);
        }
    }

    updateTransactionsList() {
        const typeFilter = this.selectors.transactionType.value;
        const categoryFilter = this.selectors.transactionCategory.value;

        let filteredTransactions = this.transactions;

        if (typeFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
        }

        if (categoryFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t =>
                t.type !== 'income' && t.category === categoryFilter
            );
        }

        if (filteredTransactions.length === 0) {
            this.displayElements.transactionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>لا توجد عمليات لعرضها</p>
                </div>
            `;
        } else {
            this.displayElements.transactionsList.innerHTML = filteredTransactions
                .slice(0, 10)
                .map(transaction => this.createTransactionElement(transaction))
                .join('');
        }
    }

    updateCategoryFilter() {
        const typeFilter = this.selectors.transactionType.value;
        const categoryFilter = this.selectors.transactionCategory;

        if (typeFilter === 'income') {
            categoryFilter.innerHTML = '<option value="all">جميع التصنيفات</option>';
            categoryFilter.disabled = true;
        } else {
            categoryFilter.innerHTML = `
                <option value="all">جميع التصنيفات</option>
                ${Object.entries(this.categories).map(([key, category]) => 
                    `<option value="${key}">${category.name}</option>`
                ).join('')}
            `;
            categoryFilter.disabled = false;
        }
    }

    createTransactionElement(transaction) {
        const isIncome = transaction.type === 'income';
        const icon = isIncome ? 'fa-arrow-down' : 'fa-arrow-up';
        const categoryName = isIncome ? transaction.source : this.categories[transaction.category]?.name;

        return `
            <div class="transaction-item transaction-${transaction.type}">
                <div class="transaction-info">
                    <div class="transaction-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${isIncome ? 'دخل' : 'مصروف'}</h4>
                        <div class="category">${categoryName}</div>
                        ${transaction.description ? `<div class="description">${transaction.description}</div>` : ''}
                    </div>
                </div>
                <div class="transaction-amount">
                    ${isIncome ? '+' : '-'} ${this.formatCurrency(transaction.amount)}
                </div>
                <div class="transaction-date">
                    ${this.formatDate(transaction.date)}
                </div>
                <div class="transaction-actions">
                    <button class="edit-btn" onclick="budgetApp.editTransaction('${transaction.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="budgetApp.deleteTransaction('${transaction.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    initializeCharts() {
        this.createExpenseChart();
        this.createComparisonChart();
        this.createTrendChart();
    }

    updateCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.initializeCharts();
    }

    createExpenseChart() {
        const ctx = document.getElementById('expenseChart')?.getContext('2d');
        if (!ctx) return;

        const period = this.selectors.chartPeriod.value;
        const expenses = this.getFilteredTransactions('expense', period);

        const categoryData = {};
        expenses.forEach(expense => {
            const category = expense.category;
            categoryData[category] = (categoryData[category] || 0) + expense.amount;
        });

        const labels = Object.keys(categoryData).map(key => this.categories[key]?.name);
        const data = Object.values(categoryData);
        const backgroundColors = Object.keys(categoryData).map(key => this.categories[key]?.color);

        this.charts.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: backgroundColors, borderWidth: 2, borderColor: '#fff' }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', rtl: true },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createComparisonChart() {
        const ctx = document.getElementById('comparisonChart')?.getContext('2d');
        if (!ctx) return;

        const period = this.selectors.chartPeriod.value;
        const months = this.getMonths(period);
        const incomeData = months.map(month => this.getMonthlyTotal('income', month));
        const expenseData = months.map(month => this.getMonthlyTotal('expense', month));

        this.charts.comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months.map(month => this.formatMonth(month)),
                datasets: [
                    { label: 'الدخل', data: incomeData, backgroundColor: 'rgba(46, 204, 113, 0.8)', borderColor: 'rgba(46, 204, 113, 1)', borderWidth: 1 },
                    { label: 'المصروفات', data: expenseData, backgroundColor: 'rgba(231, 76, 60, 0.8)', borderColor: 'rgba(231, 76, 60, 1)', borderWidth: 1 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { callback: (value) => this.formatCurrency(value) } }
                },
                plugins: { tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.raw)}` } } }
            }
        });
    }

    createTrendChart() {
        const ctx = document.getElementById('trendChart')?.getContext('2d');
        if (!ctx) return;

        const period = this.selectors.chartPeriod.value;
        const months = this.getMonths(period);
        const balanceData = months.map(month => {
            const income = this.getMonthlyTotal('income', month);
            const expense = this.getMonthlyTotal('expense', month);
            return income - expense;
        });

        this.charts.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months.map(month => this.formatMonth(month)),
                datasets: [{
                    label: 'الرصيد',
                    data: balanceData,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: { ticks: { callback: (value) => this.formatCurrency(value) } }
                },
                plugins: { tooltip: { callbacks: { label: (context) => `الرصيد: ${this.formatCurrency(context.raw)}` } } }
            }
        });
    }

    checkBudgetAlert() {
        const currentBudget = this.budgets.find(b => b.month === this.currentMonth);
        if (!currentBudget || !currentBudget.alertEnabled) return;

        const currentMonthExpenses = this.getCurrentMonthTransactions()
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const progress = (currentMonthExpenses / currentBudget.amount) * 100;

        if (progress >= 80 && progress < 100) {
            this.showNotification(
                `تحذير: لقد استهلكت ${progress.toFixed(1)}% من ميزانيتك الشهرية!`,
                'warning'
            );
        } else if (progress >= 100) {
            this.showNotification(
                `تحذير: لقد تجاوزت ميزانيتك الشهرية بنسبة ${(progress - 100).toFixed(1)}%!`,
                'error'
            );
        }
    }

    showModal(type) {
        const modal = this.modals[type];
        if (modal) {
            modal.classList.add('show');
        }
    }

    hideModal(modal) {
        if (modal) {
            modal.classList.remove('show');
        }
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('budgetTheme', newTheme);

        const icon = this.buttons.themeToggle.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        this.showNotification(`تم التبديل إلى الوضع ${newTheme === 'dark' ? 'الليلي' : 'النهاري'}`, 'info');
        setTimeout(() => this.updateCharts(), 300);
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('budgetTheme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);

        const icon = this.buttons.themeToggle.querySelector('i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    exportDataToFile() {
        try {
            const data = {
                transactions: this.transactions,
                budgets: this.budgets,
                exportDate: new Date().toISOString()
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = `budget-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showNotification('تم تصدير البيانات بنجاح', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('خطأ في تصدير البيانات', 'error');
        }
    }

    importDataFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (importedData.transactions && Array.isArray(importedData.transactions)) {
                    this.transactions = importedData.transactions;
                }
                if (importedData.budgets && Array.isArray(importedData.budgets)) {
                    this.budgets = importedData.budgets;
                }

                this.saveData();
                this.updateDashboard();
                this.showNotification('تم استيراد البيانات بنجاح', 'success');
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('خطأ في استيراد الملف. تأكد من صحة التنسيق', 'error');
            }

            event.target.value = '';
        };

        reader.readAsText(file);
    }

    saveData() {
        try {
            const data = {
                transactions: this.transactions,
                budgets: this.budgets,
                version: '1.0'
            };
            localStorage.setItem('budgetData', JSON.stringify(data));
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('خطأ في حفظ البيانات', 'error');
        }
    }

    loadData() {
        try {
            const savedData = localStorage.getItem('budgetData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.transactions = Array.isArray(data.transactions) ? data.transactions : [];
                this.budgets = Array.isArray(data.budgets) ? data.budgets : [];
            }
        } catch (error) {
            console.error('Load error:', error);
            this.transactions = [];
            this.budgets = [];
        }
    }

    getCurrentMonthTransactions() {
        return this.transactions.filter(t => t.date.startsWith(this.currentMonth));
    }

    getFilteredTransactions(type, period) {
        let transactions = this.transactions.filter(t => t.type === type);

        if (period === 'month') {
            transactions = transactions.filter(t => t.date.startsWith(this.currentMonth));
        } else if (period === 'year') {
            const currentYear = new Date().getFullYear();
            transactions = transactions.filter(t => t.date.startsWith(currentYear));
        }

        return transactions;
    }

    getMonths(period) {
        const months = [];
        const currentDate = new Date();

        if (period === 'month') {
            months.push(this.currentMonth);
        } else if (period === 'year') {
            for (let i = 0; i < 12; i++) {
                const date = new Date(currentDate.getFullYear(), i, 1);
                months.push(date.toISOString().slice(0, 7));
            }
        } else {
            const allMonths = [...new Set(this.transactions.map(t => t.date.slice(0, 7)))];
            months.push(...allMonths.sort().slice(-12));
        }

        return months;
    }

    getMonthlyTotal(type, month) {
        return this.transactions
            .filter(t => t.type === type && t.date.startsWith(month))
            .reduce((sum, t) => sum + t.amount, 0);
    }

    formatCurrency(amount) {
        const currencySetting = this.currencies[this.currentCurrency] || this.currencies['USD'];

        const formattedStr = new Intl.NumberFormat(currencySetting.locale, {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);

        return currencySetting.suffix
            ? `${formattedStr} ${currencySetting.symbol}`
            : `${currencySetting.symbol}${formattedStr}`;
    }

    changeCurrency(newCurrency) {
        this.currentCurrency = newCurrency;
        localStorage.setItem('budgetCurrency', newCurrency);
        this.updateDashboard();
        setTimeout(() => this.updateCharts(), 100);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ar-EG');
    }

    formatMonth(monthString) {
        const date = new Date(monthString + '-01');
        return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
    }

    getFormValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    }

    validateAmount(amount) {
        return !isNaN(amount) && amount > 0;
    }

    showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.setAttribute('role', 'alert');

        const backgroundColor = type === 'error' ? '#e74c3c' :
                              type === 'warning' ? '#f39c12' : 
                              type === 'success' ? '#2ecc71' : '#3498db';

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateX(-100%);
            opacity: 0;
            transition: transform 0.3s, opacity 0.3s;
            max-width: 400px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(-100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.budgetApp = new BudgetApp();
    window.budgetApp.loadTheme();
});
