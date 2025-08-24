// 全局变量
let currentPeriod = '1A';
let allData = {};
let coordinateCharts = {};
let trendChart = null;
let showComparison = false;

// 期间顺序定义
const periodOrder = ['1A', '1B', '2', '3'];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();
    initEventListeners();
    displayData(currentPeriod);
});

// 加载所有数据
async function loadAllData() {
    try {
        const periods = ['1A', '1B', '2', '3'];
        for (const period of periods) {
            const fileName = period === '1A' ? 'round_1a.json' : 
                           period === '1B' ? 'round_1b.json' : 
                           `round_${period}.json`;
            const response = await fetch(`data/${fileName}`);
            allData[period] = await response.json();
        }
        console.log('所有数据加载完成:', allData);
    } catch (error) {
        console.error('数据加载失败:', error);
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 时间期间选择器
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.disabled) return;
            
            // 更新按钮样式
            document.querySelectorAll('.period-btn').forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white');
                b.classList.add('bg-gray-300', 'text-gray-700');
            });
            this.classList.remove('bg-gray-300', 'text-gray-700');
            this.classList.add('bg-blue-500', 'text-white');
            
            // 更新当前期间并显示数据
            currentPeriod = this.dataset.period;
            displayData(currentPeriod);
        });
    });

    // 模态框关闭事件
    document.getElementById('close-trend').addEventListener('click', closeTrendModal);
    document.getElementById('trend-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeTrendModal();
        }
    });

    // 环比显示切换
    document.getElementById('show-comparison').addEventListener('change', function() {
        showComparison = this.checked;
        displayData(currentPeriod);
    });

    // 键盘导航
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const currentIndex = periodOrder.indexOf(currentPeriod);
            let newIndex;
            
            if (e.key === 'ArrowLeft') {
                newIndex = currentIndex > 0 ? currentIndex - 1 : periodOrder.length - 1;
            } else {
                newIndex = currentIndex < periodOrder.length - 1 ? currentIndex + 1 : 0;
            }
            
            const newPeriod = periodOrder[newIndex];
            if (allData[newPeriod]) {
                // 更新按钮状态
                document.querySelectorAll('.period-btn').forEach(btn => {
                    btn.classList.remove('bg-blue-500', 'text-white');
                    btn.classList.add('bg-gray-300', 'text-gray-700');
                    if (btn.dataset.period === newPeriod) {
                        btn.classList.remove('bg-gray-300', 'text-gray-700');
                        btn.classList.add('bg-blue-500', 'text-white');
                    }
                });
                
                currentPeriod = newPeriod;
                displayData(currentPeriod);
            }
        }
        
        // ESC键关闭模态框
        if (e.key === 'Escape') {
            closeTrendModal();
        }
    });
}

// 显示指定期间的数据
function displayData(period) {
    if (!allData[period]) {
        console.error(`期间 ${period} 的数据不存在`);
        return;
    }

    const data = allData[period];
    displayIndustryData(data.industryData);
    displayMarketShare(data.marketShare);
    displayCoordinateCharts(data.marketIdealValues);
}

// 显示行业数据表格
function displayIndustryData(industryData) {
    const tbody = document.getElementById('industry-data-tbody');
    tbody.innerHTML = '';

    // 获取上一个期间的数据用于环比
    const prevPeriod = getPreviousPeriod(currentPeriod);
    const prevData = prevPeriod ? allData[prevPeriod]?.industryData : null;

    Object.keys(industryData).forEach(metric => {
        const row = document.createElement('tr');
        const cells = Object.keys(industryData[metric]).map(product => {
            const currentValue = industryData[metric][product];
            const prevValue = prevData ? prevData[metric]?.[product] : null;
            
            let cellContent = formatValue(currentValue);
            
            if (showComparison && prevValue !== null && currentValue !== null && prevValue !== undefined) {
                const comparison = calculateComparison(currentValue, prevValue);
                if (comparison.change !== 0) {
                    cellContent += `<br><span class="comparison-value ${comparison.className}">
                        ${comparison.changeText}
                    </span>`;
                }
            }
            
            return `<td class="border border-gray-300 px-3 py-2 text-center text-sm">${cellContent}</td>`;
        }).join('');

        row.innerHTML = `
            <td class="border border-gray-300 px-3 py-2 font-medium cursor-pointer hover:bg-blue-50 transition-colors text-sm" 
                onclick="showTrend('${metric}', 'industry')" title="点击查看趋势">
                ${metric} 📈
            </td>
            ${cells}
        `;
        tbody.appendChild(row);
    });
}

// 显示市场份额表格
function displayMarketShare(marketShare) {
    const tbody = document.getElementById('market-share-tbody');
    tbody.innerHTML = '';

    // 获取上一个期间的数据用于环比
    const prevPeriod = getPreviousPeriod(currentPeriod);
    const prevData = prevPeriod ? allData[prevPeriod]?.marketShare : null;

    Object.keys(marketShare).forEach(group => {
        const row = document.createElement('tr');
        const cells = Object.keys(marketShare[group]).map(product => {
            const currentValue = marketShare[group][product];
            const prevValue = prevData ? prevData[group]?.[product] : null;
            
            let cellContent = `${currentValue}%`;
            
            if (showComparison && prevValue !== null && prevValue !== undefined) {
                const comparison = calculateComparison(currentValue, prevValue);
                if (comparison.change !== 0) {
                    cellContent += `<br><span class="comparison-value ${comparison.className}">
                        ${comparison.changeText}
                    </span>`;
                }
            }
            
            return `<td class="border border-gray-300 px-3 py-2 text-center text-sm">${cellContent}</td>`;
        }).join('');

        row.innerHTML = `
            <td class="border border-gray-300 px-3 py-2 font-medium cursor-pointer hover:bg-blue-50 transition-colors text-sm" 
                onclick="showTrend('组${group}', 'marketShare')" title="点击查看趋势">
                组 ${group} 📈
            </td>
            ${cells}
        `;
        tbody.appendChild(row);
    });
}

// 显示坐标图表
function displayCoordinateCharts(marketIdealValues) {
    const markets = ['尤菲亚', '纳达卡', '尼赫鲁'];
    const colors = {
        '雷墨磁1': '#FF6384',
        '雷墨磁2': '#36A2EB', 
        '雷墨磁3': '#FFCE56'
    };

    // 获取上一个期间的数据用于环比
    const prevPeriod = getPreviousPeriod(currentPeriod);
    const prevIdealValues = prevPeriod ? allData[prevPeriod]?.marketIdealValues : null;

    markets.forEach(market => {
        const ctx = document.getElementById(`chart-${market}`);
        if (!ctx) return;

        // 销毁之前的图表
        if (coordinateCharts[market]) {
            coordinateCharts[market].destroy();
        }

        // 准备数据
        const datasets = [];
        const products = ['雷墨磁1', '雷墨磁2', '雷墨磁3'];
        
        products.forEach(product => {
            if (marketIdealValues[market] && marketIdealValues[market][product]) {
                const currentPoint = marketIdealValues[market][product];
                const prevPoint = prevIdealValues?.[market]?.[product];
                
                datasets.push({
                    label: `${product}`,
                    data: [{
                        x: currentPoint.扭矩,
                        y: currentPoint.电阻,
                        product: product,
                        market: market,
                        prevX: prevPoint?.扭矩,
                        prevY: prevPoint?.电阻
                    }],
                    backgroundColor: colors[product],
                    borderColor: colors[product],
                    pointRadius: 10,
                    pointHoverRadius: 14,
                    showLine: false
                });
            }
        });

        // 创建新图表
        coordinateCharts[market] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${market}市场`,
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { 
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#ccc',
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                if (context.length > 0) {
                                    const point = context[0].raw;
                                    return `${point.market} ${point.product}`;
                                }
                                return '参考坐标';
                            },
                            label: function(context) {
                                const point = context.raw;
                                let labels = [
                                    `扭矩: ${point.x}`,
                                    `电阻: ${point.y}`
                                ];
                                
                                if (showComparison && point.prevX !== undefined && point.prevY !== undefined) {
                                    const torqueChange = ((point.x - point.prevX) / point.prevX * 100).toFixed(1);
                                    const resistanceChange = ((point.y - point.prevY) / point.prevY * 100).toFixed(1);
                                    
                                    labels.push('--- 环比变化 ---');
                                    labels.push(`扭矩: ${torqueChange > 0 ? '+' : ''}${torqueChange}%`);
                                    labels.push(`电阻: ${resistanceChange > 0 ? '+' : ''}${resistanceChange}%`);
                                }
                                
                                return labels;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '扭矩',
                            font: { size: 12, weight: 'bold' }
                        },
                        beginAtZero: true,
                        max: 5,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '电阻',
                            font: { size: 12, weight: 'bold' }
                        },
                        beginAtZero: true,
                        max: 5,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        const element = elements[0];
                        const datasetIndex = element.datasetIndex;
                        const dataset = this.data.datasets[datasetIndex];
                        const point = dataset.data[0];
                        
                        showCoordinateDetails(point);
                    }
                },
                onHover: function(event, elements) {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });
    });
}

// 显示坐标点详细信息
function showCoordinateDetails(point) {
    let message = `${point.market} ${point.product}\n\n当前值:\n扭矩: ${point.x}\n电阻: ${point.y}`;
    
    if (showComparison && point.prevX !== undefined && point.prevY !== undefined) {
        const torqueChange = ((point.x - point.prevX) / point.prevX * 100).toFixed(1);
        const resistanceChange = ((point.y - point.prevY) / point.prevY * 100).toFixed(1);
        
        message += `\n\n上期值:\n扭矩: ${point.prevX}\n电阻: ${point.prevY}`;
        message += `\n\n环比变化:\n扭矩: ${torqueChange > 0 ? '+' : ''}${torqueChange}%\n电阻: ${resistanceChange > 0 ? '+' : ''}${resistanceChange}%`;
    }
    
    alert(message);
}

// 显示趋势分析
function showTrend(indicator, type) {
    const modal = document.getElementById('trend-modal');
    const title = document.getElementById('trend-title');
    
    title.textContent = `${indicator} - 趋势分析`;
    
    // 准备趋势数据
    const periods = ['1A', '1B', '2', '3'];
    let allTrendData = [];

    if (type === 'industry') {
        // 行业数据趋势
        periods.forEach(period => {
            if (allData[period] && allData[period].industryData[indicator]) {
                const periodData = allData[period].industryData[indicator];
                Object.keys(periodData).forEach(product => {
                    const value = periodData[product];
                    if (value !== null && value !== undefined) {
                        const existingIndex = allTrendData.findIndex(item => item.product === product);
                        if (existingIndex >= 0) {
                            allTrendData[existingIndex].data.push({x: period, y: value});
                        } else {
                            allTrendData.push({
                                product: product,
                                data: [{x: period, y: value}]
                            });
                        }
                    }
                });
            }
        });
    } else if (type === 'marketShare') {
        // 市场份额趋势
        const group = indicator.replace('组', '');
        periods.forEach(period => {
            if (allData[period] && allData[period].marketShare[group]) {
                const periodData = allData[period].marketShare[group];
                Object.keys(periodData).forEach(product => {
                    const value = periodData[product];
                    const existingIndex = allTrendData.findIndex(item => item.product === product);
                    if (existingIndex >= 0) {
                        allTrendData[existingIndex].data.push({x: period, y: value});
                    } else {
                        allTrendData.push({
                            product: product,
                            data: [{x: period, y: value}]
                        });
                    }
                });
            }
        });
    }

    // 创建产品选择器
    createProductSelector(allTrendData, indicator, type);
    
    // 默认显示所有产品
    if (allTrendData.length > 0) {
        createTrendChart(allTrendData, allTrendData, indicator, type);
    }
    
    modal.classList.add('show');
}

// 创建产品选择器
function createProductSelector(allTrendData, indicator, type) {
    const selector = document.getElementById('product-selector');
    selector.innerHTML = '';
    
    // 添加"全部显示"按钮
    const allBtn = document.createElement('button');
    allBtn.className = 'px-3 py-1.5 text-sm rounded bg-blue-500 text-white transition-colors';
    allBtn.textContent = '显示全部';
    allBtn.onclick = () => {
        // 更新按钮状态
        selector.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });
        allBtn.classList.remove('bg-gray-200', 'text-gray-700');
        allBtn.classList.add('bg-blue-500', 'text-white');
        
        createTrendChart(allTrendData, allTrendData, indicator, type);
    };
    selector.appendChild(allBtn);
    
    // 添加各个产品按钮
    allTrendData.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1.5 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors';
        
        btn.textContent = item.product;
        btn.onclick = () => {
            // 更新按钮状态
            selector.querySelectorAll('button').forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-blue-500', 'text-white');
            
            createTrendChart([item], allTrendData, indicator, type);
        };
        selector.appendChild(btn);
    });
}

// 创建趋势图表
function createTrendChart(trendData, allTrendData = null, indicator = '', type = '') {
    const ctx = document.getElementById('trend-chart');
    
    // 销毁之前的图表
    if (trendChart) {
        trendChart.destroy();
    }

    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0'
    ];

    const datasets = trendData.map((item, index) => ({
        label: item.product,
        data: item.data,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.4,
        fill: false,
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 3
    }));

    trendChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            plugins: {
                title: {
                    display: true,
                    text: `${indicator} - 时间趋势分析`,
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        padding: 20,
                        font: { size: 12 },
                        usePointStyle: true
                    },
                    onClick: function(e, legendItem, legend) {
                        // 默认的图例点击行为：切换数据集的可见性
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;
                        const meta = chart.getDatasetMeta(index);
                        
                        // 切换可见性
                        meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
                        
                        // 重新渲染图表
                        chart.update();
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        title: function(context) {
                            return `期间 ${context[0].label}`;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${formatValue(context.raw.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '时间期间',
                        font: { size: 14, weight: 'bold' }
                    },
                    type: 'category',
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: type === 'marketShare' ? '市场份额 (%)' : '数值',
                        font: { size: 14, weight: 'bold' }
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// 关闭趋势模态框
function closeTrendModal() {
    const modal = document.getElementById('trend-modal');
    modal.classList.remove('show');
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }
}

// 获取上一个期间
function getPreviousPeriod(period) {
    const currentIndex = periodOrder.indexOf(period);
    return currentIndex > 0 ? periodOrder[currentIndex - 1] : null;
}

// 计算环比变化
function calculateComparison(current, previous) {
    if (previous === 0 || previous === null || previous === undefined) {
        return { change: 0, changeText: '', className: 'trend-neutral' };
    }
    
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);
    
    let className = 'trend-neutral';
    let changeText = '';
    
    if (change > 0) {
        className = 'trend-up';
        changeText = `↑ ${Math.abs(changePercent)}%`;
    } else if (change < 0) {
        className = 'trend-down';
        changeText = `↓ ${Math.abs(changePercent)}%`;
    } else {
        changeText = '→ 0%';
    }
    
    return { change, changeText, className };
}

// 格式化数值显示
function formatValue(value) {
    if (value === null || value === undefined) {
        return '-';
    }
    if (typeof value === 'number') {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return value.toLocaleString();
        } else {
            return value.toString();
        }
    }
    return value;
}
