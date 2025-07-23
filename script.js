document.addEventListener('DOMContentLoaded', () => {

    // ----------------- ESTADO DA APLICAÇÃO -----------------
    let state = {
        transactions: []
    };
    
    let chart;
    let transactionType = 'entrada'; // para o formulário

    // ----------------- ELEMENTOS DO DOM -----------------
    const kpiContainer = document.getElementById('kpi-container');
    const transactionsList = document.getElementById('transactions-list');
    const chartContainer = document.getElementById('chart-container');
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('transaction-form');
    
    // Botões
    const addReceitaBtn = document.getElementById('add-receita-btn');
    const addDespesaBtn = document.getElementById('add-despesa-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    // ----------------- FUNÇÕES PRINCIPAIS -----------------

    /**
     * Função central que redesenha toda a UI com base no estado atual.
     */
    function render() {
        renderKPIs();
        renderTransactionList();
        renderChart();
    }

    /**
     * Calcula e exibe os 4 indicadores principais (KPIs).
     */
    function renderKPIs() {
        const { transactions } = state;
        const monthlyTx = transactions.filter(t => new Date(t.date).getMonth() === new Date().getMonth());
        
        const receita = monthlyTx.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
        const despesa = monthlyTx.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
        const resultado = receita - despesa;
        const saldoTotal = transactions.reduce((sum, t) => sum + (t.type === 'entrada' ? t.amount : -t.amount), 0);
        
        kpiContainer.innerHTML = `
            <div class="kpi-card"><h4>Receita do Mês</h4><p class="positive">${formatCurrency(receita)}</p></div>
            <div class="kpi-card"><h4>Despesa do Mês</h4><p class="negative">${formatCurrency(despesa)}</p></div>
            <div class="kpi-card"><h4>Resultado do Mês</h4><p class="${resultado >= 0 ? 'positive' : 'negative'}">${formatCurrency(resultado)}</p></div>
            <div class="kpi-card"><h4>Saldo Total</h4><p>${formatCurrency(saldoTotal)}</p></div>
        `;
    }

    /**
     * Exibe a lista das últimas 5 transações.
     */
    function renderTransactionList() {
        transactionsList.innerHTML = '';
        const recentTransactions = [...state.transactions].reverse().slice(0, 5);
        
        if (recentTransactions.length === 0) {
            transactionsList.innerHTML = `<p style="color: var(--text-secondary); text-align: center;">Nenhum lançamento ainda.</p>`;
            return;
        }

        recentTransactions.forEach(t => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div>
                    <p class="description">${t.description}</p>
                    <p class="category">${t.category}</p>
                </div>
                <p class="amount ${t.type === 'entrada' ? 'positive' : 'negative'}">
                    ${t.type === 'entrada' ? '+' : '-'} ${formatCurrency(t.amount)}
                </p>
            `;
            transactionsList.appendChild(item);
        });
    }

    /**
     * Desenha ou atualiza o gráfico de linha do fluxo de caixa.
     */
    function renderChart() {
        const { transactions } = state;
        const monthlyTx = transactions.filter(t => new Date(t.date).getMonth() === new Date().getMonth());

        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const seriesData = Array(daysInMonth).fill(0);
        
        monthlyTx.forEach(t => {
            const day = new Date(t.date).getDate() - 1;
            seriesData[day] += (t.type === 'entrada' ? t.amount : -t.amount);
        });
        
        // Acumula os valores para o gráfico de fluxo
        for (let i = 1; i < seriesData.length; i++) {
            seriesData[i] += seriesData[i - 1];
        }

        const options = {
            series: [{ name: 'Fluxo de Caixa', data: seriesData }],
            chart: { type: 'area', height: '100%', toolbar: { show: false }, background: 'transparent' },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            xaxis: { categories: labels, labels: { style: { colors: '#8b949e' } } },
            yaxis: { labels: { style: { colors: '#8b949e' }, formatter: (val) => `R$ ${val.toFixed(0)}` } },
            grid: { borderColor: 'rgba(255, 255, 255, 0.1)' },
            tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.05 } }
        };

        if (chart) {
            chart.updateOptions(options);
        } else {
            chart = new ApexCharts(chartContainer, options);
            chart.render();
        }
    }
    
    // ----------------- MANIPULAÇÃO DE DADOS -----------------

    function saveState() {
        localStorage.setItem('dashboardData', JSON.stringify(state));
    }

    function loadState() {
        const savedState = localStorage.getItem('dashboardData');
        if (savedState) {
            state = JSON.parse(savedState);
        }
    }

    function addTransaction(data) {
        state.transactions.push({
            id: Date.now(),
            date: new Date().toISOString(),
            ...data
        });
        saveState();
        render();
    }
    
    // ----------------- EVENTOS -----------------

    addReceitaBtn.onclick = () => showModal('entrada');
    addDespesaBtn.onclick = () => showModal('saida');
    closeModalBtn.onclick = () => hideModal();

    function showModal(type) {
        transactionType = type;
        form.reset();
        document.getElementById('form-title').innerText = `Adicionar ${type === 'entrada' ? 'Receita' : 'Despesa'}`;
        document.getElementById('form-submit-btn').style.backgroundColor = type === 'entrada' ? 'var(--accent-receita)' : 'var(--accent-despesa)';
        modal.style.display = 'flex';
    }

    function hideModal() {
        modal.style.display = 'none';
    }

    form.onsubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        addTransaction({
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            category: formData.get('category'),
            type: transactionType
        });
        hideModal();
    };
    
    exportBtn.onclick = () => {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `caixa-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    importBtn.onclick = () => importFile.click();
    importFile.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedState = JSON.parse(e.target.result);
                if (importedState.transactions) {
                    state = importedState;
                    saveState();
                    render();
                    alert('Dados importados com sucesso!');
                }
            } catch {
                alert('Erro: Arquivo JSON inválido.');
            }
        };
        reader.readAsText(file);
        importFile.value = ''; // Limpa para poder importar o mesmo arquivo novamente
    };
    
    // ----------------- INICIALIZAÇÃO -----------------
    
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    
    loadState(); // Carrega os dados salvos
    render(); // Desenha a tela inicial
});