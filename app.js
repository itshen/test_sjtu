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
const periodOrder = ['1A', '1B', '2', '3', '4'];

// 预测算法：线性回归
function linearRegression(xValues, yValues) {
    const n = xValues.length;
    if (n < 2) return { slope: 0, intercept: yValues[0] || 0 };
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
}

// 为订单数据预测（大数值，通常呈增长趋势）
function predictOrderData(historicalValues) {
    const validValues = historicalValues.filter(val => 
        val !== null && val !== undefined && !isNaN(parseFloat(val))
    ).map(val => parseFloat(val));
    
    if (validValues.length === 0) return null;
    if (validValues.length === 1) {
        // 订单数据通常有5-15%的增长
        return Math.round(validValues[0] * 1.1 * 100) / 100;
    }
    
    // 使用线性回归预测
    const xValues = validValues.map((_, index) => index + 1);
    const { slope, intercept } = linearRegression(xValues, validValues);
    const prediction = slope * (validValues.length + 1) + intercept;
    
    // 订单数据限制在合理范围内
    const maxHistorical = Math.max(...validValues);
    const avgGrowth = validValues.length > 1 ? (validValues[validValues.length - 1] / validValues[0]) ** (1 / (validValues.length - 1)) : 1.1;
    const expectedValue = validValues[validValues.length - 1] * avgGrowth;
    
    return Math.round(Math.max(prediction, expectedValue * 0.8) * 100) / 100;
}

// 为收入数据预测（与订单相关，但有波动）
function predictRevenueData(historicalValues) {
    const validValues = historicalValues.filter(val => 
        val !== null && val !== undefined && !isNaN(parseFloat(val))
    ).map(val => parseFloat(val));
    
    if (validValues.length === 0) return null;
    if (validValues.length === 1) {
        return Math.round(validValues[0] * 1.08 * 100) / 100; // 8%增长
    }
    
    // 收入数据使用平均增长率预测
    const growth = validValues[validValues.length - 1] / validValues[0];
    const avgGrowthRate = growth ** (1 / (validValues.length - 1));
    const prediction = validValues[validValues.length - 1] * avgGrowthRate;
    
    return Math.round(prediction * 100) / 100;
}

// 为比率数据预测（百分比，相对稳定）
function predictRateData(historicalValues) {
    const validValues = historicalValues.filter(val => 
        val !== null && val !== undefined && !isNaN(parseFloat(val))
    ).map(val => parseFloat(val));
    
    if (validValues.length === 0) return null;
    if (validValues.length === 1) {
        // 比率数据变化较小，固定1%增长
        return Math.round(validValues[0] * 1.01 * 100) / 100;
    }
    
    // 使用加权平均，最近的数据权重更大
    const weights = validValues.map((_, index) => index + 1);
    const weightedSum = validValues.reduce((sum, val, index) => sum + val * weights[index], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const weightedAvg = weightedSum / totalWeight;
    
    // 添加小幅波动
    const variation = (validValues[validValues.length - 1] - validValues[0]) / validValues.length;
    const prediction = weightedAvg + variation;
    
    return Math.round(prediction * 100) / 100;
}

// 为成本数据预测（通常有通胀影响）
function predictCostData(historicalValues) {
    const validValues = historicalValues.filter(val => 
        val !== null && val !== undefined && !isNaN(parseFloat(val))
    ).map(val => parseFloat(val));
    
    if (validValues.length === 0) return null;
    if (validValues.length === 1) {
        return Math.round(validValues[0] * 1.05 * 100) / 100; // 5%通胀
    }
    
    // 成本数据通常有稳定的增长趋势
    const xValues = validValues.map((_, index) => index + 1);
    const { slope, intercept } = linearRegression(xValues, validValues);
    let prediction = slope * (validValues.length + 1) + intercept;
    
    // 确保成本不会下降太多
    const lastValue = validValues[validValues.length - 1];
    if (prediction < lastValue * 0.95) {
        prediction = lastValue * 1.02; // 最少2%增长
    }
    
    return Math.round(prediction * 100) / 100;
}

// 智能预测函数，根据数据类型选择合适的预测方法
function predictValueByType(historicalValues, dataType) {
    switch (dataType) {
        case '整个行业订单':
            return predictOrderData(historicalValues);
        case '整个行业收入（百万）':
            return predictRevenueData(historicalValues);
        case '平均行业毛利率':
            return predictRateData(historicalValues);
        case '最低期末库存成本':
            return predictCostData(historicalValues);
        default:
            // 默认使用简单的线性预测
            return predictRevenueData(historicalValues);
    }
}

// 生成Round 4预测数据
function generatePredictionData() {
    // 使用前2轮数据进行预测（Round 2 和 Round 3）
    const periods = ['2', '3'];
    const predictionData = {
        industryData: {},
        marketShare: {},
        marketIdealValues: {}
    };
    
    // 预测行业数据
    const indicators = ['整个行业订单', '整个行业收入（百万）', '平均行业毛利率', '最低期末库存成本'];
    const products = ['尤菲亚1', '尤菲亚2', '尤菲亚3', '纳达卡1', '纳达卡2', '纳达卡3', '尼赫鲁1', '尼赫鲁2', '尼赫鲁3'];
    
    indicators.forEach(indicator => {
        predictionData.industryData[indicator] = {};
        products.forEach(product => {
            const historicalValues = periods.map(period => 
                allData[period]?.industryData?.[indicator]?.[product]
            );
            predictionData.industryData[indicator][product] = predictValueByType(historicalValues, indicator);
        });
    });
    
    // 预测市场份额
    const groups = ['1', '2', '3', '4', '5'];
    const shareProducts = ['尤菲亚P1', '尤菲亚P2', '尤菲亚P3', '纳达卡P1', '纳达卡P2', '纳达卡P3', '尼赫鲁P1', '尼赫鲁P2', '尼赫鲁P3'];
    
    groups.forEach(group => {
        predictionData.marketShare[group] = {};
        shareProducts.forEach(product => {
            const historicalValues = periods.map(period => 
                allData[period]?.marketShare?.[group]?.[product]
            );
            // 市场份额使用比率数据预测逻辑
            predictionData.marketShare[group][product] = predictRateData(historicalValues);
        });
    });
    
    // 预测市场理想值
    const markets = ['尤菲亚', '纳达卡', '尼赫鲁'];
    const magnetProducts = ['雷墨磁1', '雷墨磁2', '雷墨磁3'];
    
    markets.forEach(market => {
        predictionData.marketIdealValues[market] = {};
        magnetProducts.forEach(product => {
            const historicalTorque = periods.map(period => 
                allData[period]?.marketIdealValues?.[market]?.[product]?.扭矩
            );
            const historicalResistance = periods.map(period => 
                allData[period]?.marketIdealValues?.[market]?.[product]?.电阻
            );
            
            predictionData.marketIdealValues[market][product] = {
                // 扭矩和电阻使用技术参数预测（相对稳定）
                扭矩: predictRateData(historicalTorque),
                电阻: predictRateData(historicalResistance)
            };
        });
    });
    
    return predictionData;
}

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
        allData = { ...DATA_STORAGE };
        
        // 生成预测数据
        const predictionData = generatePredictionData();
        allData['4'] = predictionData;
        
        console.log('所有数据加载完成:', allData);
        console.log('已生成Round 4预测数据:', predictionData);
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
            closePredictionInfoModal();
        }
    });

    // 预测算法说明按钮
    document.querySelectorAll('.prediction-info-trigger').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = document.getElementById('prediction-info-modal');
            modal.classList.remove('hidden');
        });
    });

    // 关闭预测算法说明模态框
    const closePredictionModal = document.getElementById('close-prediction-modal');
    const closePredictionModalBtn = document.getElementById('close-prediction-modal-btn');
    
    if (closePredictionModal) {
        closePredictionModal.addEventListener('click', closePredictionInfoModal);
    }
    if (closePredictionModalBtn) {
        closePredictionModalBtn.addEventListener('click', closePredictionInfoModal);
    }

    // 点击模态框背景关闭
    const predictionModal = document.getElementById('prediction-info-modal');
    if (predictionModal) {
        predictionModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePredictionInfoModal();
            }
        });
    }
}

// 显示指定期间的数据
function displayData(period) {
    if (!allData[period]) {
        console.error(`期间 ${period} 的数据不存在`);
        return;
    }

    const data = allData[period];
    const isPrediction = period === '4';
    
    // 显示/隐藏预测算法说明按钮
    const predictionButtons = document.querySelectorAll('.prediction-info-trigger');
    predictionButtons.forEach(btn => {
        if (isPrediction) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });
    
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

    const isPrediction = currentPeriod === '4';
    
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
            
            const predictionClass = isPrediction ? 'prediction-data' : '';
            return `<td class="border border-gray-300 px-3 py-2 text-center text-sm ${predictionClass}">${cellContent}</td>`;
        }).join('');

        const predictionClass = isPrediction ? 'prediction-data' : '';
        row.innerHTML = `
            <td class="border border-gray-300 px-3 py-2 font-medium cursor-pointer hover:bg-blue-50 transition-colors text-sm ${predictionClass}" 
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

    const isPrediction = currentPeriod === '4';
    
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
            
            const predictionClass = isPrediction ? 'prediction-data' : '';
            return `<td class="border border-gray-300 px-3 py-2 text-center text-sm ${predictionClass}">${cellContent}</td>`;
        }).join('');

        const predictionClass = isPrediction ? 'prediction-data' : '';
        row.innerHTML = `
            <td class="border border-gray-300 px-3 py-2 font-medium cursor-pointer hover:bg-blue-50 transition-colors text-sm ${predictionClass}" 
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
        }, {
            id: 'pieValueLabels',
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                const data = chart.data;
                const meta = chart.getDatasetMeta(0);
                
                meta.data.forEach((element, index) => {
                    if (!element.hidden) {
                        const value = data.datasets[0].data[index];
                        const label = data.labels[index];
                        
                        // 计算标签位置
                        const midAngle = element.startAngle + (element.endAngle - element.startAngle) / 2;
                        const x = element.x + Math.cos(midAngle) * (element.outerRadius * 0.7);
                        const y = element.y + Math.sin(midAngle) * (element.outerRadius * 0.7);
                        
                        // 绘制背景
                        ctx.save();
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                        ctx.lineWidth = 1;
                        
                        const text = `${value}%`;
                        ctx.font = 'bold 12px Arial';
                        const textWidth = ctx.measureText(text).width;
                        const padding = 4;
                        
                        // 绘制背景矩形
                        ctx.fillRect(x - textWidth/2 - padding, y - 8, textWidth + padding * 2, 16);
                        ctx.strokeRect(x - textWidth/2 - padding, y - 8, textWidth + padding * 2, 16);
                        
                        // 绘制文本
                        ctx.fillStyle = '#333';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(text, x, y);
                        ctx.restore();
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
                    text: `组${currentGroup} - 市场份额分布 (${currentPeriod}期间${currentPeriod === '4' ? ' - 预测数据' : ''})`,
                    font: { size: 16, weight: 'bold' },
                    color: currentPeriod === '4' ? '#8B5CF6' : '#333'
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
        plugins: [{
            id: 'barValueLabels',
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                
                meta.data.forEach((element, index) => {
                    const value = chart.data.datasets[0].data[index];
                    if (value > 0) {
                        ctx.save();
                        ctx.fillStyle = '#333';
                        ctx.font = 'bold 12px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        
                        // 在柱子顶部显示数值
                        const x = element.x;
                        const y = element.y - 5;
                        ctx.fillText(`${value}%`, x, y);
                        ctx.restore();
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
                    text: `${currentProduct} - 各组市场份额对比 (${currentPeriod}期间${currentPeriod === '4' ? ' - 预测数据' : ''})`,
                    font: { size: 16, weight: 'bold' },
                    color: currentPeriod === '4' ? '#8B5CF6' : '#333'
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
            plugins: [{
                id: 'coordinateValueLabels',
                afterDraw: function(chart) {
                    const ctx = chart.ctx;
                    const datasets = chart.data.datasets;
                    
                    datasets.forEach((dataset, datasetIndex) => {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        
                        dataset.data.forEach((point, index) => {
                            const element = meta.data[index];
                            if (element && !element.hidden) {
                                ctx.save();
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                                ctx.lineWidth = 1;
                                ctx.font = 'bold 10px Arial';
                                
                                const text = `(${point.x}, ${point.y})`;
                                const textWidth = ctx.measureText(text).width;
                                const padding = 3;
                                
                                // 标签位置（在点的右上方）
                                const x = element.x + 8;
                                const y = element.y - 8;
                                
                                // 绘制背景矩形
                                ctx.fillRect(x, y - 10, textWidth + padding * 2, 14);
                                ctx.strokeRect(x, y - 10, textWidth + padding * 2, 14);
                                
                                // 绘制文本
                                ctx.fillStyle = '#333';
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(text, x + padding, y - 3);
                                ctx.restore();
                            }
                        });
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
    const periods = ['1A', '1B', '2', '3', '4'];
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

    const datasets = trendData.map((item, index) => {
        // 分离预测数据点
        const historicalData = item.data.filter(point => point.x !== '4');
        const predictionData = item.data.filter(point => point.x === '4');
        
        const baseColor = colors[index % colors.length];
        const datasets = [];
        
        // 历史数据线
        if (historicalData.length > 0) {
            datasets.push({
                label: item.product,
                data: historicalData,
                borderColor: baseColor,
                backgroundColor: baseColor + '20',
                tension: 0.4,
                fill: false,
                pointRadius: 6,
                pointHoverRadius: 8,
                borderWidth: 3,
                hidden: mode === 'hide-all'
            });
        }
        
        // 预测数据点（如果存在）
        if (predictionData.length > 0) {
            datasets.push({
                label: `${item.product} (预测)`,
                data: predictionData,
                borderColor: '#8B5CF6',
                backgroundColor: '#8B5CF6',
                tension: 0,
                fill: false,
                pointRadius: 8,
                pointHoverRadius: 10,
                borderWidth: 2,
                borderDash: [10, 5],
                pointStyle: 'triangle',
                hidden: mode === 'hide-all',
                showLine: false // 只显示点，不连线
            });
        }
        
        return datasets;
    }).flat();

    trendChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        plugins: [{
            id: 'trendValueLabels',
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                const datasets = chart.data.datasets;
                
                datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    
                    if (!meta.hidden && dataset.data && dataset.data.length > 0) {
                        dataset.data.forEach((point, index) => {
                            const element = meta.data[index];
                            if (element && !element.hidden) {
                                ctx.save();
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                                ctx.strokeStyle = dataset.borderColor || '#333';
                                ctx.lineWidth = 1;
                                ctx.font = 'bold 10px Arial';
                                
                                const value = formatValue(point.y);
                                const textWidth = ctx.measureText(value).width;
                                const padding = 3;
                                
                                // 标签位置（在点的上方）
                                const x = element.x;
                                const y = element.y - 15;
                                
                                // 绘制背景矩形
                                ctx.fillRect(x - textWidth/2 - padding, y - 8, textWidth + padding * 2, 12);
                                ctx.strokeRect(x - textWidth/2 - padding, y - 8, textWidth + padding * 2, 12);
                                
                                // 绘制文本
                                ctx.fillStyle = '#333';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(value, x, y - 2);
                                ctx.restore();
                            }
                        });
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

// 关闭预测算法说明模态框
function closePredictionInfoModal() {
    const modal = document.getElementById('prediction-info-modal');
    if (modal) {
        modal.classList.add('hidden');
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
