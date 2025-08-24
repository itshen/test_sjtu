// 全局变量
let currentPeriod = '1A';
let allData = {};
let coordinateCharts = {};
let marketShareChart = null;
let productComparisonChart = null;
let trendChart = null;
let showComparison = false;
let currentGroup = '1';
let currentProduct = '尤菲亚P1';
let currentView = 'by-group';
let marketShareHiddenItems = {}; // 记录每个组的隐藏状态

// 期间顺序定义
const periodOrder = ['1A', '1B', '2', '3'];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    initAuth();
    initEventListeners();
    
    // 检查是否已登录
    if (authSystem.isSessionValid()) {
        showMainContent();
        startSessionTimer();
    } else {
        showLoginModal();
    }
});

// 加载所有数据
function loadAllData() {
    try {
        // 直接使用内嵌的数据
        allData = DATA_STORAGE;
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

    // 视图切换
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 更新按钮样式
            document.querySelectorAll('.view-btn').forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white', 'border-b-2', 'border-blue-500');
                b.classList.add('bg-gray-100', 'text-gray-700');
            });
            this.classList.remove('bg-gray-100', 'text-gray-700');
            this.classList.add('bg-blue-500', 'text-white', 'border-b-2', 'border-blue-500');
            
            // 切换视图
            currentView = this.dataset.view;
            switchView();
        });
    });

    // 组别选择器
    document.querySelectorAll('.group-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 更新按钮样式
            document.querySelectorAll('.group-btn').forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white');
                b.classList.add('bg-gray-300', 'text-gray-700');
            });
            this.classList.remove('bg-gray-300', 'text-gray-700');
            this.classList.add('bg-blue-500', 'text-white');
            
            // 更新当前组别并显示数据
            currentGroup = this.dataset.group;
            displayMarketShare(allData[currentPeriod].marketShare);
        });
    });

    // 产品选择器
    document.querySelectorAll('.product-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 更新按钮样式
            document.querySelectorAll('.product-btn').forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white');
                b.classList.add('bg-gray-300', 'text-gray-700');
            });
            this.classList.remove('bg-gray-300', 'text-gray-700');
            this.classList.add('bg-blue-500', 'text-white');
            
            // 更新当前产品并显示数据
            currentProduct = this.dataset.product;
            displayProductComparison(allData[currentPeriod].marketShare);
        });
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
    displayMarketShareTable(data.marketShare);
    
    // 根据当前视图显示对应的图表
    if (currentView === 'by-group') {
        displayMarketShare(data.marketShare);
    } else {
        displayProductComparison(data.marketShare);
    }
    
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
function displayMarketShareTable(marketShare) {
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

// 显示市场份额饼图
function displayMarketShare(marketShare) {
    const ctx = document.getElementById('market-share-chart');
    if (!ctx) return;

    // 销毁之前的图表
    if (marketShareChart) {
        marketShareChart.destroy();
    }

    // 获取当前组的数据
    const groupData = marketShare[currentGroup];
    if (!groupData) return;

    // 准备饼图数据
    const labels = [];
    const data = [];
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0'
    ];

    Object.keys(groupData).forEach((product, index) => {
        labels.push(product);
        data.push(groupData[product]);
    });

    // 恢复之前的隐藏状态
    const groupKey = `group_${currentGroup}`;
    const hiddenItems = marketShareHiddenItems[groupKey] || [];

    // 创建饼图
    marketShareChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        plugins: [{
            id: 'customLegend',
            afterDraw: function(chart) {
                const legend = chart.legend;
                const ctx = chart.ctx;
                
                legend.legendItems.forEach((legendItem, index) => {
                    if (legendItem.hidden) {
                        const legendRect = legend.legendHitBoxes[index];
                        if (legendRect) {
                            ctx.save();
                            ctx.strokeStyle = '#999999';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(legendRect.left, legendRect.top + legendRect.height / 2);
                            ctx.lineTo(legendRect.left + legendRect.width, legendRect.top + legendRect.height / 2);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                });
            }
        }],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                title: {
                    display: true,
                    text: `组${currentGroup} - 市场份额分布 (${currentPeriod}期间)`,
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        padding: 20,
                        font: { size: 12 },
                        usePointStyle: false,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const meta = chart.getDatasetMeta(0);
                                    const hidden = meta.data[i] ? meta.data[i].hidden : false;
                                    
                                    return {
                                        text: `${label}: ${value}%`,
                                        fillStyle: hidden ? '#cccccc' : data.datasets[0].backgroundColor[i],
                                        strokeStyle: hidden ? '#999999' : data.datasets[0].backgroundColor[i],
                                        lineWidth: 2,
                                        hidden: hidden,
                                        index: i,
                                        fontColor: hidden ? '#999999' : '#333333'
                                    };
                                });
                            }
                            return [];
                        }
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.index;
                        const chart = legend.chart;
                        const meta = chart.getDatasetMeta(0);
                        
                        // 切换数据的可见性
                        if (meta.data[index]) {
                            meta.data[index].hidden = !meta.data[index].hidden;
                            
                            // 保存隐藏状态
                            const groupKey = `group_${currentGroup}`;
                            if (!marketShareHiddenItems[groupKey]) {
                                marketShareHiddenItems[groupKey] = [];
                            }
                            
                            const productName = chart.data.labels[index];
                            const hiddenList = marketShareHiddenItems[groupKey];
                            
                            if (meta.data[index].hidden) {
                                // 添加到隐藏列表
                                if (!hiddenList.includes(productName)) {
                                    hiddenList.push(productName);
                                }
                            } else {
                                // 从隐藏列表移除
                                const hiddenIndex = hiddenList.indexOf(productName);
                                if (hiddenIndex > -1) {
                                    hiddenList.splice(hiddenIndex, 1);
                                }
                            }
                        }
                        
                        // 重新渲染图表和图例
                        chart.update();
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            return `${label}: ${value}%`;
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const element = elements[0];
                    const label = this.data.labels[element.index];
                    // 可以添加点击产品的处理逻辑
                    console.log(`点击了 ${label}`);
                }
            }
        }
    });

    // 应用之前保存的隐藏状态
    if (hiddenItems.length > 0) {
        const meta = marketShareChart.getDatasetMeta(0);
        labels.forEach((label, index) => {
            if (hiddenItems.includes(label)) {
                meta.data[index].hidden = true;
            }
        });
        marketShareChart.update();
    }
}

// 视图切换函数
function switchView() {
    const groupView = document.getElementById('group-view');
    const productView = document.getElementById('product-view');
    
    if (currentView === 'by-group') {
        groupView.classList.remove('hidden');
        productView.classList.add('hidden');
        displayMarketShare(allData[currentPeriod].marketShare);
    } else {
        groupView.classList.add('hidden');
        productView.classList.remove('hidden');
        displayProductComparison(allData[currentPeriod].marketShare);
    }
}

// 显示产品对比图表
function displayProductComparison(marketShare) {
    const ctx = document.getElementById('product-comparison-chart');
    if (!ctx) return;

    // 销毁之前的图表
    if (productComparisonChart) {
        productComparisonChart.destroy();
    }

    // 准备数据：收集选中产品在各个组的市场份额
    const labels = ['组1', '组2', '组3', '组4', '组5'];
    const data = [];
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

    labels.forEach((label, index) => {
        const groupNumber = (index + 1).toString();
        const value = marketShare[groupNumber] ? marketShare[groupNumber][currentProduct] : 0;
        data.push(value);
    });

    // 创建柱状图
    productComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `${currentProduct} 市场份额`,
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color + 'CC'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                title: {
                    display: true,
                    text: `${currentProduct} - 各组市场份额对比 (${currentPeriod}期间)`,
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        title: function(context) {
                            return `${context[0].label}`;
                        },
                        label: function(context) {
                            return `${currentProduct}: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '组别',
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '市场份额 (%)',
                        font: { size: 12, weight: 'bold' }
                    },
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const element = elements[0];
                    const groupIndex = element.index + 1;
                    console.log(`点击了组${groupIndex}的${currentProduct}`);
                }
            }
        }
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
                animation: false,
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
                        min: 0,
                        ticks: {
                            stepSize: 0.5,
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.2)',
                            lineWidth: 1,
                            drawTicks: true,
                            tickLength: 8
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
                        min: 0,
                        ticks: {
                            stepSize: 0.5,
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.2)',
                            lineWidth: 1,
                            drawTicks: true,
                            tickLength: 8
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
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'crosshair';
                    
                    // 显示实时坐标
                    const chart = this;
                    const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
                    
                    // 获取鼠标位置对应的数据坐标
                    const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);
                    const dataY = chart.scales.y.getValueForPixel(canvasPosition.y);
                    
                    // 创建或更新坐标显示
                    let coordDisplay = document.getElementById(`coord-display-${market}`);
                    if (!coordDisplay) {
                        coordDisplay = document.createElement('div');
                        coordDisplay.id = `coord-display-${market}`;
                        coordDisplay.style.cssText = `
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            background: rgba(255, 255, 255, 0.9);
                            padding: 6px 10px;
                            border-radius: 4px;
                            font-size: 11px;
                            border: 1px solid #ccc;
                            pointer-events: none;
                            z-index: 100;
                            font-family: monospace;
                        `;
                        chart.canvas.parentElement.style.position = 'relative';
                        chart.canvas.parentElement.appendChild(coordDisplay);
                    }
                    
                    if (dataX >= 0 && dataX <= 5 && dataY >= 0 && dataY <= 5) {
                        coordDisplay.innerHTML = `
                            <div style="color: #666; font-weight: bold;">实时坐标</div>
                            <div>扭矩: ${Math.max(0, Math.min(5, dataX)).toFixed(2)}</div>
                            <div>电阻: ${Math.max(0, Math.min(5, dataY)).toFixed(2)}</div>
                        `;
                        coordDisplay.style.display = 'block';
                    } else {
                        coordDisplay.style.display = 'none';
                    }
                },
                onLeave: function(event) {
                    // 隐藏坐标显示
                    const coordDisplay = document.getElementById(`coord-display-${market}`);
                    if (coordDisplay) {
                        coordDisplay.style.display = 'none';
                    }
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
        createTrendChart(allTrendData, allTrendData, indicator, type, 'show-all');
    }
    
    modal.classList.add('show');
}

// 创建产品选择器
function createProductSelector(allTrendData, indicator, type) {
    const selector = document.getElementById('product-selector');
    selector.innerHTML = '';
    
    // 添加"显示全部"按钮
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
        
        createTrendChart(allTrendData, allTrendData, indicator, type, 'show-all');
    };
    selector.appendChild(allBtn);

    // 添加"隐藏全部"按钮
    const hideAllBtn = document.createElement('button');
    hideAllBtn.className = 'px-3 py-1.5 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors';
    hideAllBtn.textContent = '隐藏全部';
    hideAllBtn.onclick = () => {
        // 更新按钮状态
        selector.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });
        hideAllBtn.classList.remove('bg-gray-200', 'text-gray-700');
        hideAllBtn.classList.add('bg-blue-500', 'text-white');
        
        createTrendChart(allTrendData, allTrendData, indicator, type, 'hide-all');
    };
    selector.appendChild(hideAllBtn);
    
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
function createTrendChart(trendData, allTrendData = null, indicator = '', type = '', mode = 'show-all') {
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
        borderWidth: 3,
        hidden: mode === 'hide-all' // 如果是隐藏全部模式，设置为隐藏
    }));

    trendChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
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

// 鉴权相关函数
function initAuth() {
    // 登录按钮事件
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    
    // 退出按钮事件
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // 回车键登录
    document.getElementById('access-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

function handleLogin() {
    const password = document.getElementById('access-password').value.trim();
    const errorDiv = document.getElementById('login-error');
    
    // 隐藏之前的错误
    errorDiv.classList.add('hidden');
    
    if (!password) {
        showLoginError('请输入访问密码');
        return;
    }
    
    if (password.length !== 6) {
        showLoginError('访问密码必须是6位数字');
        return;
    }
    
    // 验证密码
    if (authSystem.validateAccessPassword(password)) {
        authSystem.setSession();
        hideLoginModal();
        showMainContent();
        startSessionTimer();
        
        // 清空密码输入
        document.getElementById('access-password').value = '';
    } else {
        showLoginError('访问密码错误，请检查后重试');
    }
}

function handleLogout() {
    authSystem.clearSession();
    stopSessionTimer();
    hideMainContent();
    showLoginModal();
}

function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('session-info').classList.add('hidden');
    
    // 聚焦密码输入框
    setTimeout(() => {
        document.getElementById('access-password').focus();
    }, 100);
}

function hideLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function showMainContent() {
    hideLoginModal();
    // 不立即显示会话信息，等到剩余10分钟时才显示
    displayData(currentPeriod);
}

function hideMainContent() {
    document.getElementById('session-info').classList.add('hidden');
}

// 会话计时器
let sessionTimer = null;

function startSessionTimer() {
    updateSessionTimer();
    // 每30秒更新一次，以便及时显示最后一分钟的秒数
    sessionTimer = setInterval(updateSessionTimer, 30000);
}

function stopSessionTimer() {
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }
}

function updateSessionTimer() {
    const remaining = authSystem.getRemainingTime();
    const sessionInfo = document.getElementById('session-info');
    const timerSpan = document.getElementById('session-timer');
    
    if (remaining <= 0) {
        // 会话过期，自动登出
        handleLogout();
        showLoginError('会话已过期，请重新登录');
        return;
    }
    
    // 只在剩余10分钟或更少时显示会话信息
    if (remaining <= 10) {
        sessionInfo.classList.remove('hidden');
        
        // 格式化时间显示
        let timeDisplay;
        if (remaining === 1) {
            // 最后一分钟显示秒数
            const remainingSeconds = Math.floor((authSystem.getSessionExpiry() - Date.now()) / 1000);
            if (remainingSeconds <= 60) {
                timeDisplay = `${remainingSeconds}秒`;
                // 每秒更新一次
                if (sessionTimer) {
                    clearInterval(sessionTimer);
                }
                sessionTimer = setInterval(updateSessionTimer, 1000);
            } else {
                timeDisplay = '1分钟';
            }
        } else {
            timeDisplay = `${remaining}分钟`;
        }
        
        timerSpan.textContent = timeDisplay;
        
        // 添加警告样式
        const container = timerSpan.parentElement.parentElement;
        const indicator = container.querySelector('.rounded-full');
        
        container.classList.add('bg-yellow-50', 'border-yellow-200');
        indicator.classList.remove('bg-green-500');
        indicator.classList.add('bg-yellow-500');
    } else {
        // 超过10分钟时隐藏会话信息
        sessionInfo.classList.add('hidden');
    }
}
