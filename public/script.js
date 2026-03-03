let cachedYieldsData = [];
let activeChainFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    fetchYieldsData();

    // Listen for inputs on the calculator
    document.getElementById('investment-input').addEventListener('input', () => {
        renderTableRows();
    });

    // Listen for clicks on chain filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked
            const clickedBtn = e.currentTarget;
            clickedBtn.classList.add('active');

            // Fetch fresh data for this specific chain
            activeChainFilter = clickedBtn.getAttribute('data-chain');
            fetchYieldsData(activeChainFilter);
        });
    });
});

async function fetchYieldsData(chain = 'all') {
    const tableBody = document.getElementById('yield-table-body');
    const formattedChain = chain.charAt(0).toUpperCase() + chain.slice(1);

    // Show spinner
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center loading-text"><div class="spinner"></div> <span style="margin-left: 10px;">Loading ${formattedChain} top yields...</span></td></tr>`;

    try {
        const response = await fetch(`/api/yields?chain=${chain}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        cachedYieldsData = data.pools || [];

        // Update Chain Counts from backend metadata
        updateChainCounts(data.counts);

        // Clear loading text
        tableBody.innerHTML = '';

        if (cachedYieldsData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center loading-text">No pools found matching criteria.</td></tr>`;
            return;
        }

        renderTableRows();

    } catch (error) {
        console.error('Error fetching yields:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center loading-text" style="color:#ef4444;">Error fetching data. Check console.</td></tr>`;
    }
}

function updateChainCounts(counts) {
    if (!counts) return;

    // Update DOM
    Object.keys(counts).forEach(chain => {
        const badge = document.getElementById(`count-${chain}`);
        if (badge) {
            badge.textContent = counts[chain];
        }
    });
}

function renderTableRows() {
    const tableBody = document.getElementById('yield-table-body');
    tableBody.innerHTML = '';

    const investmentStr = document.getElementById('investment-input').value;
    const investmentAmount = parseFloat(investmentStr) || 0;

    if (!cachedYieldsData || cachedYieldsData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center loading-text">No pools match the selected chain.</td></tr>`;
        return;
    }

    cachedYieldsData.forEach((pool, index) => {
        const row = document.createElement('tr');
        row.classList.add('fade-in');
        row.style.animationDelay = `${index * 0.03}s`;

        // Format numbers
        const formattedTvl = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(pool.tvlUsd);

        const formattedApy = (pool.apyAnnual).toFixed(2) + '%';

        // Calculate Profits
        const dailyProfit = investmentAmount * (pool.apyAnnual / 100) / 365;
        const monthlyProfit = investmentAmount * (pool.apyAnnual / 100) / 12;

        const formattedDailyProfit = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(dailyProfit);

        const formattedMonthlyProfit = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(monthlyProfit);

        // IL Risk Badges
        const riskText = pool.ilRisk || 'Unknown';
        const riskClass = riskText.toLowerCase();

        // Create a unique ID for the canvas
        const canvasId = `chart-${index}`;

        row.innerHTML = `
            <td>
                <a href="https://defillama.com/yields/pool/${pool.poolId}" target="_blank" class="symbol-col pool-link">${pool.symbol}</a>
                <span class="project-name">${pool.project}</span>
            </td>
            <td>
                <span class="chain-badge">${pool.chain}</span>
            </td>
            <td class="tvl-col num-value">${formattedTvl}</td>
            <td class="text-center">
                <span class="risk-badge risk-${riskClass}">${riskText}</span>
            </td>
            <td class="text-right num-value">${formattedApy}</td>
            <td class="text-right num-value profit-col">${formattedDailyProfit}</td>
            <td class="text-right num-value profit-col">${formattedMonthlyProfit}</td>
            <td class="text-center">
                <div class="chart-container">
                    <canvas id="${canvasId}"></canvas>
                </div>
            </td>
        `;

        tableBody.appendChild(row);

        // Render Chart.js
        renderMiniChart(canvasId, pool.history7d);
    });
}

function renderMiniChart(canvasId, dataPoints) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !dataPoints || dataPoints.length === 0) return;

    const ctx = canvas.getContext('2d');

    // Get the line color from CSS variables
    const rootStyles = getComputedStyle(document.documentElement);
    const lineColor = rootStyles.getPropertyValue('--chart-line-color').trim() || '#a78bfa';

    // Generate dummy labels since x-axis is hidden
    const labels = dataPoints.map((_, i) => `Day ${i + 1}`);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: dataPoints,
                borderColor: lineColor,
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            },
            animation: { duration: 0 },
            layout: { padding: 0 }
        }
    });
}
