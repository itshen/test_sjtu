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
let teamCharts = {}; // 团队图表实例
let teamPositionDetailChart = null; // 团队位置详细图表实例
let currentDetailMarket = ''; // 当前详细查看的市场

// 期间顺序定义
const periodOrder = ['1A', '1B', '2', '3', '4', '5'];

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

// 为价格数据预测（结合趋势和市场波动）
function predictPriceData(historicalValues) {
    const validValues = historicalValues.filter(val => 
        val !== null && val !== undefined && !isNaN(parseFloat(val))
    ).map(val => parseFloat(val));
    
    if (validValues.length === 0) return null;
    if (validValues.length === 1) {
        // 价格通常有小幅调整
        return Math.round(validValues[0] * (0.98 + Math.random() * 0.04) * 100) / 100;
    }
    
    // 计算价格变化趋势
    const xValues = validValues.map((_, index) => index + 1);
    const { slope, intercept } = linearRegression(xValues, validValues);
    let prediction = slope * (validValues.length + 1) + intercept;
    
    // 价格波动性较大，添加基于历史波动的调整
    const volatility = calculateVolatility(validValues);
    const marketAdjustment = (Math.random() - 0.5) * volatility * 0.3;
    prediction += marketAdjustment;
    
    // 确保价格合理范围（不会过低或过高）
    const avgPrice = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    if (prediction < avgPrice * 0.7) prediction = avgPrice * 0.7;
    if (prediction > avgPrice * 1.8) prediction = avgPrice * 1.5;
    
    return Math.round(prediction * 100) / 100;
}

// 计算价格波动性
function calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

// 研发费用计算算法 - 基于扭矩和电阻变化
function calculateRDCost(torqueChange, resistanceChange, productType = '雷墨磁1/3') {
    // 基于分析数据的费用预测模型
    
    // 扭矩变化费用模型（百万美元）
    const torqueCostModel = {
        0.7: { min: 1.1, max: 1.15, successRate: 0.67 },
        1.0: { min: 0.18, max: 0.40, successRate: 0.0 },
        1.4: { min: 1.38, max: 1.38, successRate: 1.0 },
        4.0: { min: 4.0, max: 6.0, successRate: 0.5 }
    };
    
    // 电阻变化费用模型（百万美元）
    const resistanceCostModel = {
        0.4: { min: 0.18, max: 0.40, successRate: 0.0 },
        0.8: { min: 0.75, max: 0.75, successRate: 0.0 },
        0.9: { min: 1.10, max: 1.15, successRate: 1.0 },
        1.0: { min: 1.38, max: 1.38, successRate: 1.0 },
        4.0: { min: 4.0, max: 6.0, successRate: 0.5 }
    };
    
    // 产品类型系数
    const productMultiplier = {
        '雷墨磁1': 0.671,  // 单位变化成本
        '雷墨磁2': 0.734,
        '雷墨磁3': 0.671,
        '雷墨磁1/3': 0.671
    };
    
    // 插值函数 - 根据已知数据点估算
    function interpolateCost(change, model) {
        const keys = Object.keys(model).map(k => parseFloat(k)).sort((a, b) => a - b);
        
        // 如果变化值在已知范围内，进行插值
        if (change <= keys[0]) {
            const data = model[keys[0]];
            return {
                minCost: data.min,
                maxCost: data.max,
                avgCost: (data.min + data.max) / 2,
                successRate: data.successRate
            };
        }
        
        if (change >= keys[keys.length - 1]) {
            const data = model[keys[keys.length - 1]];
            // 对于超出范围的大变化，按比例增加成本
            const multiplier = change / keys[keys.length - 1];
            return {
                minCost: data.min * multiplier,
                maxCost: data.max * multiplier,
                avgCost: (data.min + data.max) / 2 * multiplier,
                successRate: Math.max(0.1, data.successRate - 0.1 * (multiplier - 1))
            };
        }
        
        // 线性插值
        for (let i = 0; i < keys.length - 1; i++) {
            if (change >= keys[i] && change <= keys[i + 1]) {
                const ratio = (change - keys[i]) / (keys[i + 1] - keys[i]);
                const data1 = model[keys[i]];
                const data2 = model[keys[i + 1]];
                
                return {
                    minCost: data1.min + (data2.min - data1.min) * ratio,
                    maxCost: data1.max + (data2.max - data1.max) * ratio,
                    avgCost: (data1.min + data1.max) / 2 + ((data2.min + data2.max) / 2 - (data1.min + data1.max) / 2) * ratio,
                    successRate: data1.successRate + (data2.successRate - data1.successRate) * ratio
                };
            }
        }
        
        // 默认返回
        return { minCost: 0.5, maxCost: 2.0, avgCost: 1.25, successRate: 0.3 };
    }
    
    // 计算扭矩和电阻的费用
    const torqueCost = interpolateCost(Math.abs(torqueChange), torqueCostModel);
    const resistanceCost = interpolateCost(Math.abs(resistanceChange), resistanceCostModel);
    
    // 组合费用 - 考虑协同效应
    let combinedMinCost = torqueCost.minCost + resistanceCost.minCost;
    let combinedMaxCost = torqueCost.maxCost + resistanceCost.maxCost;
    let combinedAvgCost = torqueCost.avgCost + resistanceCost.avgCost;
    
    // 如果两个参数都有变化，增加复杂性成本
    if (Math.abs(torqueChange) > 0.1 && Math.abs(resistanceChange) > 0.1) {
        const complexityMultiplier = 1.2;
        combinedMinCost *= complexityMultiplier;
        combinedMaxCost *= complexityMultiplier;
        combinedAvgCost *= complexityMultiplier;
    }
    
    // 应用产品类型系数
    const multiplier = productMultiplier[productType] || productMultiplier['雷墨磁1/3'];
    
    // 综合成功率 - 取较低者（风险较高）
    const combinedSuccessRate = Math.min(torqueCost.successRate, resistanceCost.successRate);
    
    // 风险调整 - 成功率低的项目需要更多预算
    const riskMultiplier = 1 + (1 - combinedSuccessRate) * 0.5;
    
    return {
        minCost: Math.round(combinedMinCost * multiplier * riskMultiplier * 100) / 100,
        maxCost: Math.round(combinedMaxCost * multiplier * riskMultiplier * 100) / 100,
        avgCost: Math.round(combinedAvgCost * multiplier * riskMultiplier * 100) / 100,
        successRate: Math.round(combinedSuccessRate * 100),
        torqueChange: Math.abs(torqueChange),
        resistanceChange: Math.abs(resistanceChange),
        riskLevel: combinedSuccessRate > 0.7 ? '低风险' : combinedSuccessRate > 0.4 ? '中风险' : '高风险'
    };
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

// 生成Round 5预测数据
function generatePredictionData() {
    // 使用前3轮数据进行预测（Round 2、3、4）
    const periods = ['2', '3', '4'];
    const predictionData = {
        industryData: {},
        marketShare: {},
        marketPricing: {},
        marketIdealValues: {},
        teamCoordinates: {}
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
    
    // 预测市场定价
    groups.forEach(group => {
        predictionData.marketPricing[group] = {};
        shareProducts.forEach(product => {
            const historicalValues = periods.map(period => 
                allData[period]?.marketPricing?.[group]?.[product]
            );
            // 市场定价使用价格数据预测逻辑
            predictionData.marketPricing[group][product] = predictPriceData(historicalValues);
        });
    });
    
    // 预测市场理想值
    const markets = ['尤菲亚', '纳达卡', '尼赫鲁'];
    const idealMagnetProducts = ['雷墨磁1', '雷墨磁2', '雷墨磁3'];
    
    markets.forEach(market => {
        predictionData.marketIdealValues[market] = {};
        idealMagnetProducts.forEach(product => {
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
    
    // 预测各组产品特性坐标数据
    const teams = ['1', '2', '3', '4', '5'];
    const teamMagnetProducts = ['雷墨磁1', '雷墨磁2', '雷墨磁3'];
    
    teams.forEach(teamId => {
        predictionData.teamCoordinates[teamId] = {};
        teamMagnetProducts.forEach(product => {
            const historicalTorque = periods.map(period => 
                allData[period]?.teamCoordinates?.[teamId]?.[product]?.扭矩
            );
            const historicalResistance = periods.map(period => 
                allData[period]?.teamCoordinates?.[teamId]?.[product]?.电阻
            );
            const historicalDeviations = periods.map(period => 
                allData[period]?.teamCoordinates?.[teamId]?.[product]?.偏离度
            );
            
            // 获取最近的目标市场
            const recentTargetMarket = allData['3']?.teamCoordinates?.[teamId]?.[product]?.目标市场 || 
                                     allData['2']?.teamCoordinates?.[teamId]?.[product]?.目标市场 || '无';
            
            const predictedTorque = predictRateData(historicalTorque);
            const predictedResistance = predictRateData(historicalResistance);
            const predictedDeviation = predictRateData(historicalDeviations);
            
            // 确保预测值不为null，使用最后一个有效值作为后备
            const lastValidTorque = historicalTorque.filter(v => v !== null && v !== undefined).pop();
            const lastValidResistance = historicalResistance.filter(v => v !== null && v !== undefined).pop();
            const lastValidDeviation = historicalDeviations.filter(v => v !== null && v !== undefined).pop();
            
            predictionData.teamCoordinates[teamId][product] = {
                扭矩: predictedTorque !== null ? predictedTorque : lastValidTorque,
                电阻: predictedResistance !== null ? predictedResistance : lastValidResistance,
                目标市场: recentTargetMarket,
                偏离度: predictedDeviation !== null ? predictedDeviation : lastValidDeviation
            };
        });
    });
    
    return predictionData;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 注册Chart.js插件
    if (typeof Chart !== 'undefined' && typeof zoomPlugin !== 'undefined') {
        Chart.register(zoomPlugin);
    }
    
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
        allData['5'] = predictionData;
        
        console.log('所有数据加载完成:', allData);
        console.log('已生成Round 5预测数据:', predictionData);
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

    // 团队位置详细模态框事件
    document.getElementById('close-team-position').addEventListener('click', closeTeamPositionModal);
    document.getElementById('team-position-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeTeamPositionModal();
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

    // 费用计算详情展开/收起
    const toggleButton = document.getElementById('toggle-calculation-details');
    const detailsDiv = document.getElementById('calculation-details');
    
    if (toggleButton && detailsDiv) {
        toggleButton.addEventListener('click', function() {
            if (detailsDiv.classList.contains('hidden')) {
                detailsDiv.classList.remove('hidden');
                toggleButton.textContent = '[收起详情]';
            } else {
                detailsDiv.classList.add('hidden');
                toggleButton.textContent = '[展开详情]';
            }
        });
    }

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
            closeTeamPositionModal();
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
    const isPrediction = period === '5';
    
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
    displayMarketPricingTable(data.marketPricing);
    
    // 根据当前视图显示对应的图表
    if (currentView === 'by-group') {
        displayMarketShare(data.marketShare);
    } else {
        displayProductComparison(data.marketShare);
    }
    
    // 显示各团队产品特性坐标对比数据
    displayTeamComparison(data.teamCoordinates);
    displayTeamPositionCharts(data.teamCoordinates, data.marketIdealValues);
    
    displayCoordinateCharts(data.marketIdealValues);
}

// 显示行业数据表格
function displayIndustryData(industryData) {
    const tbody = document.getElementById('industry-data-tbody');
    tbody.innerHTML = '';

    const isPrediction = currentPeriod === '5';
    
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

    const isPrediction = currentPeriod === '5';
    
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

// 显示市场定价表格
function displayMarketPricingTable(marketPricing) {
    const tbody = document.getElementById('market-pricing-tbody');
    tbody.innerHTML = '';

    const isPrediction = currentPeriod === '5';
    
    // 获取上一个期间的数据用于环比
    const prevPeriod = getPreviousPeriod(currentPeriod);
    const prevData = prevPeriod ? allData[prevPeriod]?.marketPricing : null;

    Object.keys(marketPricing).forEach(group => {
        const row = document.createElement('tr');
        const cells = Object.keys(marketPricing[group]).map(product => {
            const currentValue = marketPricing[group][product];
            const prevValue = prevData ? prevData[group]?.[product] : null;
            
            let cellContent = `${currentValue}`;
            
            if (showComparison && prevValue !== null && prevValue !== undefined) {
                const comparison = calculateComparison(currentValue, prevValue);
                if (comparison.change !== 0) {
                    const arrow = comparison.direction === 'up' ? '↗' : '↘';
                    const color = comparison.direction === 'up' ? 'text-green-600' : 'text-red-600';
                    cellContent += ` <span class="${color} text-xs">${arrow}${Math.abs(comparison.change).toFixed(1)}</span>`;
                }
            }
            
            return cellContent;
        });
        
        row.innerHTML = `
            <td class="border border-gray-300 px-4 py-2 font-medium bg-gray-50">组${group}</td>
            ${cells.map(cell => `<td class="border border-gray-300 px-4 py-2 text-center ${isPrediction ? 'bg-purple-50 font-semibold text-purple-700' : ''}">${cell}</td>`).join('')}
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
                        max: 5.5,
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
                        max: 5.5,
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
                    
                    // 显示实时坐标和费用预测
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
                            position: fixed;
                            background: rgba(255, 255, 255, 0.95);
                            padding: 8px 12px;
                            border-radius: 6px;
                            font-size: 11px;
                            border: 1px solid #ccc;
                            pointer-events: none;
                            z-index: 1000;
                            font-family: monospace;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            max-width: 280px;
                            min-width: 240px;
                            display: none;
                        `;
                        document.body.appendChild(coordDisplay);
                    }
                    
                    // 动态定位浮窗
                    const rect = chart.canvas.getBoundingClientRect();
                    const mouseX = event.native.clientX;
                    const mouseY = event.native.clientY;
                    
                    if (dataX >= 0 && dataX <= 5 && dataY >= 0 && dataY <= 5) {
                        const currentTorque = Math.max(0, Math.min(5, dataX));
                        const currentResistance = Math.max(0, Math.min(5, dataY));
                        
                        // 获取当前市场的三个产品圆点位置，计算每个产品到鼠标位置的费用
                        const currentData = allData[currentPeriod]?.marketIdealValues?.[market];
                        const productCosts = [];
                        
                        if (currentData) {
                            Object.keys(currentData).forEach(productName => {
                                const productData = currentData[productName];
                                if (productData) {
                                    // 计算从产品当前位置到鼠标位置的偏移量
                                    const torqueChange = currentTorque - productData.扭矩;
                                    const resistanceChange = currentResistance - productData.电阻;
                                    
                                    // 确定产品类型
                                    let productType = '雷墨磁1/3';
                                    if (productName.includes('2')) {
                                        productType = '雷墨磁2';
                                    } else if (productName.includes('3')) {
                                        productType = '雷墨磁3';
                                    } else {
                                        productType = '雷墨磁1';
                                    }
                                    
                                    // 计算将该产品从当前位置调整到鼠标位置的费用
                                    const costEstimate = calculateRDCost(torqueChange, resistanceChange, productType);
                                    productCosts.push({
                                        name: productName,
                                        type: productType,
                                        currentPosition: `(${productData.扭矩.toFixed(2)}, ${productData.电阻.toFixed(2)})`,
                                        torqueChange: torqueChange,
                                        resistanceChange: resistanceChange,
                                        cost: costEstimate
                                    });
                                }
                            });
                        }
                        
                        // 如果没有产品数据，使用默认计算
                        if (productCosts.length === 0) {
                            const torqueChange = currentTorque - 2.5;
                            const resistanceChange = currentResistance - 2.5;
                            const costEstimate = calculateRDCost(torqueChange, resistanceChange);
                            productCosts.push({
                                name: '默认产品',
                                type: '雷墨磁1/3',
                                currentPosition: '(2.50, 2.50)',
                                torqueChange: torqueChange,
                                resistanceChange: resistanceChange,
                                cost: costEstimate
                            });
                        }
                        
                        // 定位浮窗（避免被框在容器内）
                        let tooltipX = mouseX + 15;
                        let tooltipY = mouseY - 10;
                        
                        // 防止浮窗超出屏幕边界
                        if (tooltipX + 220 > window.innerWidth) {
                            tooltipX = mouseX - 235;
                        }
                        if (tooltipY < 10) {
                            tooltipY = 10;
                        }
                        if (tooltipY + 300 > window.innerHeight) {
                            tooltipY = window.innerHeight - 310;
                        }
                        
                        coordDisplay.style.left = tooltipX + 'px';
                        coordDisplay.style.top = tooltipY + 'px';
                        
                        // 使用统一的蓝色主题样式
                        coordDisplay.className = `cost-display`;
                        
                        // 生成产品费用列表 - 显示从当前位置到鼠标位置的预算
                        const productCostHtml = productCosts.map(product => {
                            return `
                                <div style="border-left: 3px solid #3B82F6; padding-left: 8px; margin: 4px 0;">
                                    <div style="color: #374151; font-weight: bold; font-size: 10px;">${product.name}</div>
                                    <div style="color: #6B7280; font-size: 9px;">当前位置: ${product.currentPosition}</div>
                                    <div style="color: #6B7280; font-size: 9px;">调整量: 扭矩${product.torqueChange >= 0 ? '+' : ''}${product.torqueChange.toFixed(2)}, 电阻${product.resistanceChange >= 0 ? '+' : ''}${product.resistanceChange.toFixed(2)}</div>
                                    <div style="color: #1F2937; font-size: 10px; font-weight: bold;">研发预算: $${product.cost.avgCost}M</div>
                                    <div style="color: #6B7280; font-size: 9px;">预算范围: $${product.cost.minCost}M - $${product.cost.maxCost}M</div>
                                </div>
                            `;
                        }).join('');
                        
                        coordDisplay.innerHTML = `
                            <div class="coordinate-info-section">
                                <div style="color: #374151; font-weight: bold; margin-bottom: 4px;">📍 位置信息</div>
                                <div style="color: #6B7280;">扭矩: ${currentTorque.toFixed(2)}</div>
                                <div style="color: #6B7280;">电阻: ${currentResistance.toFixed(2)}</div>
                            </div>
                            
                            <div class="coordinate-info-section">
                                <div style="color: #374151; font-weight: bold; margin-bottom: 4px;">💰 ${market}市场 - 调整到目标位置的研发预算</div>
                                ${productCostHtml}
                            </div>
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
    const periods = ['1A', '1B', '2', '3', '4', '5'];
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
        const historicalData = item.data.filter(point => point.x !== '5');
        const predictionData = item.data.filter(point => point.x === '5');
        
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
function formatValue(value, metric = null) {
    if (value === null || value === undefined) {
        return '-';
    }
    if (typeof value === 'number') {
        // 对于"整个行业订单"，始终显示完整数值
        if (metric === '整个行业订单') {
            return value.toLocaleString();
        }
        // 其他情况保持原有逻辑
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

// 显示各团队产品特性坐标对比表格
function displayTeamComparison(teamCoordinates) {
    const tbody = document.getElementById('team-comparison-tbody');
    if (!tbody || !teamCoordinates) return;
    
    tbody.innerHTML = '';
    const isPrediction = currentPeriod === '5';

    // 获取上一个期间的数据用于环比
    const prevPeriod = getPreviousPeriod(currentPeriod);
    const prevTeamData = prevPeriod ? allData[prevPeriod]?.teamCoordinates : null;

    Object.keys(teamCoordinates).forEach(teamId => {
        const team = teamCoordinates[teamId];
        const prevTeam = prevTeamData ? prevTeamData[teamId] : null;
        
        // 计算平均偏离度
        const deviations = [];
        Object.keys(team).forEach(product => {
            if (team[product].偏离度 !== null && team[product].偏离度 !== undefined) {
                deviations.push(team[product].偏离度);
            }
        });
        const avgDeviation = deviations.length > 0 ? 
            (deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length).toFixed(3) : '-';

        // 计算趋势
        let trendIndicator = '→';
        let trendClass = 'text-gray-500';
        if (prevTeam) {
            const prevDeviations = [];
            Object.keys(prevTeam).forEach(product => {
                if (prevTeam[product].偏离度 !== null && prevTeam[product].偏离度 !== undefined) {
                    prevDeviations.push(prevTeam[product].偏离度);
                }
            });
            const prevAvgDeviation = prevDeviations.length > 0 ? 
                prevDeviations.reduce((sum, dev) => sum + dev, 0) / prevDeviations.length : null;
            
            if (prevAvgDeviation !== null && avgDeviation !== '-') {
                const currentAvg = parseFloat(avgDeviation);
                if (currentAvg < prevAvgDeviation) {
                    trendIndicator = '↓';
                    trendClass = 'text-green-500';
                } else if (currentAvg > prevAvgDeviation) {
                    trendIndicator = '↑';
                    trendClass = 'text-red-500';
                }
            }
        }

        const row = document.createElement('tr');
        const predictionClass = isPrediction ? 'prediction-data' : '';
        
        row.innerHTML = `
            <td class="border border-gray-300 px-3 py-2 font-medium cursor-pointer hover:bg-blue-50 transition-colors text-sm ${predictionClass}" 
                onclick="showTeamTrend('${teamId}')" title="点击查看该组产品特性趋势">
                第 ${teamId} 组 📈
            </td>
            <td class="border border-gray-300 px-3 py-2 text-center text-xs ${predictionClass}">
                <div>扭矩: ${team.雷墨磁1.扭矩}</div>
                <div>电阻: ${team.雷墨磁1.电阻}</div>
                <div class="text-blue-600">目标: ${team.雷墨磁1.目标市场}</div>
                <div class="text-orange-600">偏离: ${team.雷墨磁1.偏离度 || '-'}</div>
            </td>
            <td class="border border-gray-300 px-3 py-2 text-center text-xs ${predictionClass}">
                <div>扭矩: ${team.雷墨磁2.扭矩}</div>
                <div>电阻: ${team.雷墨磁2.电阻}</div>
                <div class="text-blue-600">目标: ${team.雷墨磁2.目标市场}</div>
                <div class="text-orange-600">偏离: ${team.雷墨磁2.偏离度 || '-'}</div>
            </td>
            <td class="border border-gray-300 px-3 py-2 text-center text-xs ${predictionClass}">
                <div>扭矩: ${team.雷墨磁3.扭矩}</div>
                <div>电阻: ${team.雷墨磁3.电阻}</div>
                <div class="text-blue-600">目标: ${team.雷墨磁3.目标市场}</div>
                <div class="text-orange-600">偏离: ${team.雷墨磁3.偏离度 || '-'}</div>
            </td>
            <td class="border border-gray-300 px-3 py-2 text-center font-semibold ${predictionClass}">
                ${avgDeviation}
            </td>
            <td class="border border-gray-300 px-3 py-2 text-center text-lg ${trendClass} ${predictionClass}">
                ${trendIndicator}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 显示各组产品在各市场的位置图表
function displayTeamPositionCharts(teamCoordinates, marketIdealValues) {
    if (!teamCoordinates || !marketIdealValues) {
        console.error('团队坐标数据或市场理想值数据缺失:', { teamCoordinates, marketIdealValues });
        return;
    }
    
    const markets = ['尤菲亚', '纳达卡', '尼赫鲁'];
    const teamColors = {
        '1': '#FF6384',
        '2': '#36A2EB', 
        '3': '#FFCE56',
        '4': '#4BC0C0',
        '5': '#9966FF'
    };

    markets.forEach(market => {
        const ctx = document.getElementById(`team-chart-${market}`);
        if (!ctx) return;

        // 销毁之前的图表
        if (teamCharts[market]) {
            teamCharts[market].destroy();
        }

        // 准备数据
        const datasets = [];
        
        // 添加市场理想值点（作为参考）
        const idealProducts = ['雷墨磁1', '雷墨磁2', '雷墨磁3'];
        idealProducts.forEach((product, index) => {
            if (marketIdealValues[market] && marketIdealValues[market][product]) {
                const idealPoint = marketIdealValues[market][product];
                datasets.push({
                    label: `${product} (理想值)`,
                    data: [{
                        x: idealPoint.扭矩,
                        y: idealPoint.电阻,
                        product: product,
                        market: market,
                        type: 'ideal'
                    }],
                    backgroundColor: 'rgba(255, 0, 0, 0.9)',
                    borderColor: 'rgba(200, 0, 0, 1)',
                    pointRadius: 12,
                    pointHoverRadius: 15,
                    showLine: false,
                    pointStyle: 'triangle',
                    borderWidth: 3
                });
            }
        });

        // 添加团队数据点
        Object.keys(teamCoordinates).forEach(teamId => {
            const team = teamCoordinates[teamId];
            idealProducts.forEach(product => {
                if (team[product] && 
                    team[product].扭矩 !== null && team[product].扭矩 !== undefined &&
                    team[product].电阻 !== null && team[product].电阻 !== undefined) {
                    
                    datasets.push({
                        label: `第${teamId}组 ${product}`,
                        data: [{
                            x: team[product].扭矩,
                            y: team[product].电阻,
                            teamId: teamId,
                            product: product,
                            targetMarket: team[product].目标市场,
                            deviation: team[product].偏离度,
                            type: 'team'
                        }],
                        backgroundColor: teamColors[teamId],
                        borderColor: teamColors[teamId],
                        pointRadius: 10,
                        pointHoverRadius: 12,
                        showLine: false,
                        borderWidth: 2
                    });
                }
            });
        });

        // 创建新图表
        teamCharts[market] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            plugins: [{
                id: 'hideLegend',
                beforeInit: function(chart) {
                    // 强制隐藏图例
                    if (chart.legend) {
                        chart.legend.options.display = false;
                    }
                }
            }, {
                id: 'teamLabels',
                afterDraw: function(chart) {
                    const ctx = chart.ctx;
                    const datasets = chart.data.datasets;
                    
                    datasets.forEach((dataset, datasetIndex) => {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        
                        dataset.data.forEach((point, index) => {
                            const element = meta.data[index];
                            if (element && !element.hidden) {
                                ctx.save();
                                
                                if (point.type === 'team') {
                                    // 团队产品标签
                                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                                    ctx.lineWidth = 1;
                                    ctx.font = 'bold 9px Arial';
                                    
                                    // 产品编号：雷墨磁1=1, 雷墨磁2=2, 雷墨磁3=3
                                    const productNumber = point.product === '雷墨磁1' ? '1' : 
                                                         point.product === '雷墨磁2' ? '2' : '3';
                                    const text = productNumber;
                                    
                                    // 标签位置（在点的中心）
                                    const x = element.x;
                                    const y = element.y;
                                    
                                    // 绘制背景圆形
                                    ctx.beginPath();
                                    ctx.arc(x, y, 8, 0, 2 * Math.PI);
                                    ctx.fill();
                                    ctx.stroke();
                                    
                                    // 绘制文本
                                    ctx.fillStyle = '#333';
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillText(text, x, y);
                                } else if (point.type === 'ideal') {
                                    // 理想值标签（在三角形中心显示数字）
                                    ctx.fillStyle = '#fff';
                                    ctx.strokeStyle = 'rgba(200, 0, 0, 0.8)';
                                    ctx.lineWidth = 1;
                                    ctx.font = 'bold 8px Arial';
                                    
                                    // 理想值编号：雷墨磁1=1, 雷墨磁2=2, 雷墨磁3=3
                                    const idealNumber = point.product === '雷墨磁1' ? '1' : 
                                                       point.product === '雷墨磁2' ? '2' : '3';
                                    const text = idealNumber;
                                    
                                    // 标签位置（在三角形的中心）
                                    const x = element.x;
                                    const y = element.y;
                                    
                                    // 绘制文本（直接在三角形上，不添加背景）
                                    ctx.fillStyle = '#fff';
                                    ctx.strokeStyle = '#333';
                                    ctx.lineWidth = 0.5;
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.strokeText(text, x, y);
                                    ctx.fillText(text, x, y);
                                }
                                
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
                        text: `${market}市场 - 各组产品位置`,
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                        display: false  // 隐藏图例，因为信息较多
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            title: function(context) {
                                if (context.length > 0) {
                                    const point = context[0].raw;
                                    if (point.type === 'ideal') {
                                        return `${point.market} ${point.product} (理想值)`;
                                    } else {
                                        return `第${point.teamId}组 ${point.product}`;
                                    }
                                }
                                return '';
                            },
                            label: function(context) {
                                const point = context.raw;
                                let labels = [
                                    `扭矩: ${point.x}`,
                                    `电阻: ${point.y}`
                                ];
                                
                                if (point.type === 'team') {
                                    labels.push(`目标市场: ${point.targetMarket || '无'}`);
                                    if (point.deviation !== null && point.deviation !== undefined) {
                                        labels.push(`偏离度: ${point.deviation}`);
                                    } else {
                                        labels.push(`偏离度: 无数据`);
                                    }
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
                        max: 5.5,
                        min: 0,
                        ticks: {
                            stepSize: 0.5,
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        },
                        grid: {
                            display: true,
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
                        max: 5.5,
                        min: 0,
                        ticks: {
                            stepSize: 0.5,
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                interaction: {
                    mode: 'point'
                },
                plugins: {
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy',
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        }
                    }
                },
                onClick: function(event, elements) {
                    // 点击图表区域打开详细模态框
                    showTeamPositionDetail(market);
                }
            }
        });
    });
}

// 显示该组产品特性趋势分析
function showTeamTrend(teamId) {
    const modal = document.getElementById('trend-modal');
    const title = document.getElementById('trend-title');
    
    title.textContent = `第${teamId}组 - 产品特性坐标趋势分析`;
    
    // 准备趋势数据
    const periods = ['1A', '1B', '2', '3'];
    const products = ['雷墨磁1', '雷墨磁2', '雷墨磁3'];
    let allTrendData = [];

    products.forEach(product => {
        const torqueData = [];
        const resistanceData = [];
        const deviationData = [];
        
        periods.forEach(period => {
            if (allData[period] && allData[period].teamCoordinates && allData[period].teamCoordinates[teamId]) {
                const teamProduct = allData[period].teamCoordinates[teamId][product];
                if (teamProduct) {
                    torqueData.push({x: period, y: teamProduct.扭矩});
                    resistanceData.push({x: period, y: teamProduct.电阻});
                    if (teamProduct.偏离度 !== null && teamProduct.偏离度 !== undefined) {
                        deviationData.push({x: period, y: teamProduct.偏离度});
                    }
                }
            }
        });
        
        if (torqueData.length > 0) {
            allTrendData.push({
                product: `${product} - 扭矩`,
                data: torqueData
            });
        }
        if (resistanceData.length > 0) {
            allTrendData.push({
                product: `${product} - 电阻`,
                data: resistanceData
            });
        }
        if (deviationData.length > 0) {
            allTrendData.push({
                product: `${product} - 偏离度`,
                data: deviationData
            });
        }
    });

    // 创建产品选择器
    createProductSelector(allTrendData, `第${teamId}组`, 'teamTrend');
    
    // 默认显示所有产品
    if (allTrendData.length > 0) {
        createTrendChart(allTrendData, allTrendData, `第${teamId}组`, 'teamTrend', 'show-all');
    }
    
    modal.classList.add('show');
}

// 显示团队位置详细模态框
function showTeamPositionDetail(market) {
    const modal = document.getElementById('team-position-modal');
    const title = document.getElementById('team-position-title');
    
    currentDetailMarket = market;
    title.textContent = `${market}市场 - 各组产品特性坐标详细视图`;
    
    // 创建筛选控件
    createTeamFilterControls();
    createProductFilterControls();
    
    // 创建详细图表
    createTeamPositionDetailChart(market);
    
    modal.classList.add('show');
}

// 关闭团队位置详细模态框
function closeTeamPositionModal() {
    const modal = document.getElementById('team-position-modal');
    modal.classList.remove('show');
    if (teamPositionDetailChart) {
        teamPositionDetailChart.destroy();
        teamPositionDetailChart = null;
    }
}

// 创建组别筛选控件
function createTeamFilterControls() {
    const container = document.getElementById('team-filter-controls');
    container.innerHTML = '';
    
    const teams = ['1', '2', '3', '4', '5'];
    const teamColors = {
        '1': '#FF6384',
        '2': '#36A2EB', 
        '3': '#FFCE56',
        '4': '#4BC0C0',
        '5': '#9966FF'
    };
    
    teams.forEach(teamId => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `team-filter-${teamId}`;
        checkbox.checked = true;
        checkbox.className = 'mr-2';
        checkbox.addEventListener('change', updateTeamPositionChart);
        
        const label = document.createElement('label');
        label.htmlFor = `team-filter-${teamId}`;
        label.className = 'flex items-center text-sm cursor-pointer';
        label.innerHTML = `
            <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${teamColors[teamId]}"></div>
            第${teamId}组
        `;
        label.prepend(checkbox);
        
        container.appendChild(label);
    });
}

// 创建产品筛选控件
function createProductFilterControls() {
    const container = document.getElementById('product-filter-controls');
    container.innerHTML = '';
    
    const products = ['雷墨磁1', '雷墨磁2', '雷墨磁3'];
    
    products.forEach(product => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `product-filter-${product}`;
        checkbox.checked = true;
        checkbox.className = 'mr-2';
        checkbox.addEventListener('change', updateTeamPositionChart);
        
        const label = document.createElement('label');
        label.htmlFor = `product-filter-${product}`;
        label.className = 'flex items-center text-sm cursor-pointer';
        label.textContent = product;
        label.prepend(checkbox);
        
        container.appendChild(label);
    });
}

// 创建团队位置详细图表
function createTeamPositionDetailChart(market) {
    const ctx = document.getElementById('team-position-detail-chart');
    if (!ctx) return;

    // 销毁之前的图表
    if (teamPositionDetailChart) {
        teamPositionDetailChart.destroy();
    }

    const teamCoordinates = allData[currentPeriod]?.teamCoordinates;
    const marketIdealValues = allData[currentPeriod]?.marketIdealValues;
    
    if (!teamCoordinates || !marketIdealValues) return;

    // 准备数据
    const datasets = [];
    const teamColors = {
        '1': '#FF6384',
        '2': '#36A2EB', 
        '3': '#FFCE56',
        '4': '#4BC0C0',
        '5': '#9966FF'
    };

    // 添加市场理想值点（作为参考）
    const idealProducts = ['雷墨磁1', '雷墨磁2', '雷墨磁3'];
    idealProducts.forEach((product, index) => {
        if (marketIdealValues[market] && marketIdealValues[market][product]) {
            const idealPoint = marketIdealValues[market][product];
            datasets.push({
                label: `${product} (理想值)`,
                data: [{
                    x: idealPoint.扭矩,
                    y: idealPoint.电阻,
                    product: product,
                    market: market,
                    type: 'ideal'
                }],
                backgroundColor: 'rgba(255, 0, 0, 0.9)',
                borderColor: 'rgba(200, 0, 0, 1)',
                pointRadius: 15,
                pointHoverRadius: 18,
                showLine: false,
                pointStyle: 'triangle',
                borderWidth: 3
            });
        }
    });

    // 添加团队数据点
    Object.keys(teamCoordinates).forEach(teamId => {
        const team = teamCoordinates[teamId];
        idealProducts.forEach(product => {
            if (team[product] && 
                team[product].扭矩 !== null && team[product].扭矩 !== undefined &&
                team[product].电阻 !== null && team[product].电阻 !== undefined) {
                
                datasets.push({
                    label: `第${teamId}组 ${product}`,
                    data: [{
                        x: team[product].扭矩,
                        y: team[product].电阻,
                        teamId: teamId,
                        product: product,
                        targetMarket: team[product].目标市场,
                        deviation: team[product].偏离度,
                        type: 'team'
                    }],
                    backgroundColor: teamColors[teamId],
                    borderColor: teamColors[teamId],
                    pointRadius: 15,
                    pointHoverRadius: 18,
                    showLine: false,
                    borderWidth: 2
                });
            }
        });
    });

    // 创建新图表，支持缩放和平移
    teamPositionDetailChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        plugins: [{
            id: 'detailTeamLabels',
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                const datasets = chart.data.datasets;
                
                datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    
                    dataset.data.forEach((point, index) => {
                        const element = meta.data[index];
                            if (element && !element.hidden) {
                                ctx.save();
                                
                                if (point.type === 'team') {
                                    // 团队产品标签
                                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                                    ctx.lineWidth = 2;
                                    ctx.font = 'bold 12px Arial';
                                    
                                    // 产品编号：雷墨磁1=1, 雷墨磁2=2, 雷墨磁3=3
                                    const productNumber = point.product === '雷墨磁1' ? '1' : 
                                                         point.product === '雷墨磁2' ? '2' : '3';
                                    const text = productNumber;
                                    
                                    // 标签位置（在点的中心）
                                    const x = element.x;
                                    const y = element.y;
                                    
                                    // 绘制背景圆形
                                    ctx.beginPath();
                                    ctx.arc(x, y, 12, 0, 2 * Math.PI);
                                    ctx.fill();
                                    ctx.stroke();
                                    
                                    // 绘制文本
                                    ctx.fillStyle = '#333';
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillText(text, x, y);
                                } else if (point.type === 'ideal') {
                                    // 理想值标签（在三角形中心显示数字）
                                    ctx.font = 'bold 10px Arial';
                                    
                                    // 理想值编号：雷墨磁1=1, 雷墨磁2=2, 雷墨磁3=3
                                    const idealNumber = point.product === '雷墨磁1' ? '1' : 
                                                       point.product === '雷墨磁2' ? '2' : '3';
                                    const text = idealNumber;
                                    
                                    // 标签位置（在三角形的中心）
                                    const x = element.x;
                                    const y = element.y;
                                    
                                    // 绘制文本（直接在三角形上，不添加背景）
                                    ctx.fillStyle = '#fff';
                                    ctx.strokeStyle = '#333';
                                    ctx.lineWidth = 0.8;
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.strokeText(text, x, y);
                                    ctx.fillText(text, x, y);
                                }
                                
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
                    text: `${market}市场 - 各组产品特性坐标详细视图 (${currentPeriod}期间${currentPeriod === '4' ? ' - 预测数据' : ''})`,
                    font: { size: 16, weight: 'bold' },
                    color: currentPeriod === '4' ? '#8B5CF6' : '#333'
                },
                legend: {
                    display: false  // 隐藏图例，使用侧边栏控制
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#fff',
                    borderWidth: 1,
                    cornerRadius: 8,
                    bodySpacing: 4,
                    callbacks: {
                        title: function(context) {
                            if (context.length > 0) {
                                const point = context[0].raw;
                                if (point.type === 'ideal') {
                                    return `${point.market} ${point.product} (理想值)`;
                                } else {
                                    return `第${point.teamId}组 ${point.product}`;
                                }
                            }
                            return '';
                        },
                        label: function(context) {
                            const point = context.raw;
                            let labels = [
                                `扭矩: ${point.x}`,
                                `电阻: ${point.y}`
                            ];
                            
                            if (point.type === 'team') {
                                labels.push(`目标市场: ${point.targetMarket || '无'}`);
                                if (point.deviation !== null && point.deviation !== undefined) {
                                    labels.push(`偏离度: ${point.deviation}`);
                                } else {
                                    labels.push(`偏离度: 无数据`);
                                }
                            }
                            
                            return labels;
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                        speed: 0.1
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        speed: 0.5
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '扭矩',
                        font: { size: 14, weight: 'bold' }
                    },
                    beginAtZero: true,
                    max: 5,
                    min: 0,
                    ticks: {
                        stepSize: 0.1,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '电阻',
                        font: { size: 14, weight: 'bold' }
                    },
                    beginAtZero: true,
                    max: 5,
                    min: 0,
                    ticks: {
                        stepSize: 0.1,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });

    // 添加重置按钮事件
    document.getElementById('reset-team-chart').onclick = function() {
        if (teamPositionDetailChart) {
            teamPositionDetailChart.resetZoom();
        }
    };
}

// 更新团队位置图表（根据筛选条件）
function updateTeamPositionChart() {
    if (!teamPositionDetailChart) return;
    
    // 获取筛选状态
    const selectedTeams = [];
    const selectedProducts = [];
    
    document.querySelectorAll('#team-filter-controls input[type="checkbox"]:checked').forEach(checkbox => {
        selectedTeams.push(checkbox.id.replace('team-filter-', ''));
    });
    
    document.querySelectorAll('#product-filter-controls input[type="checkbox"]:checked').forEach(checkbox => {
        selectedProducts.push(checkbox.id.replace('product-filter-', ''));
    });
    
    // 更新数据集的可见性
    teamPositionDetailChart.data.datasets.forEach((dataset, index) => {
        const meta = teamPositionDetailChart.getDatasetMeta(index);
        const data = dataset.data[0];
        
        if (data.type === 'ideal') {
            // 理想值始终显示
            meta.hidden = false;
        } else if (data.type === 'team') {
            // 根据筛选条件显示/隐藏团队数据
            const showTeam = selectedTeams.includes(data.teamId);
            const showProduct = selectedProducts.includes(data.product);
            meta.hidden = !(showTeam && showProduct);
        }
    });
    
    teamPositionDetailChart.update();
}
