#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析历史数据趋势，为HTML系统生成预测算法
作者: 洛小山 (Luoxiaoshan)
"""

import json
import math

# 历史数据 (更新Q1、Q2实际值)
historical_data = {
    'euphoria': {
        'rehm1': {'torque': [4.36, 4.24, 3.6, 3.2], 'resistance': [3.77, 3.75, 3.7, 3.6]},
        'rehm2': {'torque': [2.46, 2.61, 2.6, 2.7], 'resistance': [2.32, 2.51, 2.5, 2.6]},
        'rehm3': {'torque': [1.85, 2.20, 2.6, 2.9], 'resistance': [3.50, 3.51, 3.5, 3.5]}
    },
    'ledakka': {
        'rehm1': {'torque': [4.03, 3.84, 3.6, 3.4], 'resistance': [4.29, 4.26, 4.2, 4.1]},
        'rehm2': {'torque': [2.57, 2.51, 2.5, 2.5], 'resistance': [2.55, 2.60, 2.7, 2.7]},
        'rehm3': {'torque': [1.10, 1.20, 1.3, 1.4], 'resistance': [1.49, 1.50, 1.5, 1.5]}
    },
    'nihono': {
        'rehm1': {'torque': [4.07, 4.20, 4.3, 4.5], 'resistance': [2.20, 2.35, 2.5, 2.7]},
        'rehm2': {'torque': [3.52, 3.73, 3.8, 4.2], 'resistance': [2.58, 2.71, 2.8, 2.9]},
        'rehm3': {'torque': [4.40, 4.15, 3.9, 3.7], 'resistance': [1.47, 1.54, 1.6, 1.7]}
    }
}

def linear_regression(x_values, y_values):
    """计算线性回归参数 y = ax + b"""
    n = len(x_values)
    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x * y for x, y in zip(x_values, y_values))
    sum_x2 = sum(x * x for x in x_values)
    
    # 计算斜率和截距
    a = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
    b = (sum_y - a * sum_x) / n
    
    return a, b

def predict_values(quarters, current_values):
    """预测未来季度的值"""
    x_values = list(range(1, len(current_values) + 1))  # Q1=1, Q2=2, Q3=3, Q4=4
    
    # 线性回归
    a, b = linear_regression(x_values, current_values)
    
    predicted = {}
    for q in quarters:
        quarter_num = int(q[1:])  # Q1 -> 1, Q5 -> 5, Q6 -> 6
        if quarter_num <= 4:
            # 使用历史数据
            predicted[q] = current_values[quarter_num - 1]
        else:
            # 使用线性回归预测
            predicted[q] = a * quarter_num + b
    
    return predicted

def generate_prediction_data():
    """生成所有预测数据"""
    quarters = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']
    prediction_data = {}
    
    for market, products in historical_data.items():
        prediction_data[market] = {}
        for product, metrics in products.items():
            prediction_data[market][product] = {}
            
            # 预测扭矩和电阻
            torque_pred = predict_values(quarters, metrics['torque'])
            resistance_pred = predict_values(quarters, metrics['resistance'])
            
            prediction_data[market][product] = {
                'torque': torque_pred,
                'resistance': resistance_pred
            }
            
            print(f"{market.upper()} {product.upper()}:")
            print(f"  扭矩趋势: {metrics['torque']} -> Q5: {torque_pred['Q5']:.2f}, Q6: {torque_pred['Q6']:.2f}")
            print(f"  电阻趋势: {metrics['resistance']} -> Q5: {resistance_pred['Q5']:.2f}, Q6: {resistance_pred['Q6']:.2f}")
            print()
    
    return prediction_data

# 生成预测数据
print("=== 市场理想值趋势分析与预测 ===\n")
prediction_data = generate_prediction_data()

# 保存为JSON文件供HTML使用
with open('/Users/easontsui/Documents/GitHub/test_sjtu/market_data.json', 'w', encoding='utf-8') as f:
    json.dump(prediction_data, f, indent=2, ensure_ascii=False)

print("数据已保存到 market_data.json")

# 计算趋势类型
print("=== 趋势分析 ===")
for market, products in historical_data.items():
    print(f"\n{market.upper()}:")
    for product, metrics in products.items():
        torque_trend = "上升" if metrics['torque'][-1] > metrics['torque'][0] else "下降" if metrics['torque'][-1] < metrics['torque'][0] else "稳定"
        resistance_trend = "上升" if metrics['resistance'][-1] > metrics['resistance'][0] else "下降" if metrics['resistance'][-1] < metrics['resistance'][0] else "稳定"
        print(f"  {product.upper()}: 扭矩{torque_trend}, 电阻{resistance_trend}")
