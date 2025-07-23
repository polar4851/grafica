document.addEventListener('DOMContentLoaded', () => {

    // ----------------- ESTADO DA APLICAÇÃO -----------------
    let state = {
        transactions: []
    };
    
    let chart;
    let transactionType = 'entrada';

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
    const resetBtn = document.getElementById('reset-btn'); // Novo botão

    // ----------------- FUNÇÕES PRINCIPAIS -----------------

    function render() {
        renderKPIs();
        renderTransactionList();
        renderChart();
    }

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
     * LÓGICA DO GRÁFICO CORRIGIDA E MELHORADA
     */
    function renderChart() {
        const { transactions } = state;
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
        
        // 1. Calcula o saldo inicial do mês (saldo de tudo que veio antes)
        const saldoInicialDoMes = transactions
            .filter(t => new Date(t.date) < startOfMonth)
            .reduce((sum, t) => sum + (t.type === 'entrada' ? t.amount : -t.amount), 0);
            
        // 2. Cria um array com o ganho/perda de cada dia do mês atual
        const dailyNets = Array(daysInMonth).fill(0);
        transactions
            .filter(t => new Date(t.date).getMonth() === today.getMonth())
            .forEach(t => {
                const day = new Date(t.date).getDate() - 1;
                dailyNets[day] += (t.type === 'entrada' ? t.amount : -t.amount);
            });
            
        // 3. Cria a série de dados acumulada para o gráfico
        const seriesData = [];
        let saldoAcumulado = saldoInicialDoMes;
        for(let i = 0; i < daysInMonth; i++) {
            saldoAcumulado += dailyNets[i];
            seriesData.push(saldoAcumulado);
        }

        const options = {
            series: [{ name: 'Saldo em Caixa', data: seriesData }],
            chart: { type: 'area', height: '100%', toolbar: { show: false }, background: 'transparent' },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3, colors: [ '#8b5cf6' ]}, // Linha roxa e mais grossa
            xaxis: { categories: labels, labels: { style: { colors: '#8b949e' } }, axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { labels: { style: { colors: '#8b949e' }, formatter: (val) => `R$ ${Math.round(val/1000)}k` } }, // Formato em milhares
            grid: { borderColor: 'rgba(255, 255, 255, 0.1)', strokeDashArray: 5 },
            tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
            fill: { 
                type: 'gradient', 
                colors: [ '#8b5cf6' ],
                gradient: { 
                    shadeIntensity: 1,
                    opacityFrom: 0.7, 
                    opacityTo: 0.1,
                    stops: [0, 90, 100]
                }
            },
            markers: {
                size: 0, // Remove as bolinhas da linha
                hover: { size: 5 }
            }
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
    
    // NOVA FUNÇÃO PARA RESETAR O ESTADO
    function resetState() {
        if (confirm('Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.')) {
            state = { transactions: [] }; // Limpa o estado
            localStorage.removeItem('dashboardData'); // Limpa o navegador
            render(); // Redesenha a tela vazia
            alert('Dashboard resetado com sucesso!');
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
    resetBtn.onclick = () => resetState(); // Evento para o novo botão

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
        importFile.value = '';
    };
    
    // ----------------- INICIALIZAÇÃO -----------------
    
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    }
    
    loadState();
    render();
});