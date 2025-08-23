#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析目标市场偏离度的计算公式
作者: 洛小山 (Luoxiaoshan)
"""

import math

# 市场理想值数据
market_ideal = {
    '尤菲亚': {
        '雷墨磁1': (4.24, 3.75),
        '雷墨磁2': (2.61, 2.51),
        '雷墨磁3': (2.20, 3.51)
    },
    '纳达卡': {
        '雷墨磁1': (3.84, 4.26),
        '雷墨磁2': (2.51, 2.60),
        '雷墨磁3': (1.20, 1.50)
    },
    '尼赫鲁': {
        '雷墨磁1': (4.20, 2.35),
        '雷墨磁2': (3.73, 2.71),
        '雷墨磁3': (4.15, 1.54)
    }
}

# 产品特性数据
products = [
    # 组序1
    [(4.2, 3.9, '尤1', 0.15), (3.7, 2.7, '尼2', 0.03), (2.2, 3.5, '尤3', 0.01)],
    # 组序2
    [(4.4, 3.8, '尤1', 0.16), (2.5, 2.3, '纳2', 0.23), (1.9, 3.5, '尤3', 0.30)],
    # 组序3
    [(3.8, 3.8, '纳1', 0.46), (3.6, 2.6, '尼2', 0.17), (2.2, 3.5, '尤3', 0.01)],
    # 组序4
    [(4.2, 2.4, '尼1', 0.05), (2.6, 2.5, '尤2', 0.01), (2.2, 3.5, '尤3', 0.01)],
    # 组序5
    [(4.0, 2.5, '无', None), (3.7, 2.7, '纳2', 1.11), (2.0, 3.5, '尤3', 0.20)]
]

def get_target_coordinates(target_market):
    """获取目标市场的理想坐标"""
    market_map = {
        '尤1': market_ideal['尤菲亚']['雷墨磁1'],
        '尤2': market_ideal['尤菲亚']['雷墨磁2'],
        '尤3': market_ideal['尤菲亚']['雷墨磁3'],
        '纳1': market_ideal['纳达卡']['雷墨磁1'],
        '纳2': market_ideal['纳达卡']['雷墨磁2'],
        '纳3': market_ideal['纳达卡']['雷墨磁3'],
        '尼1': market_ideal['尼赫鲁']['雷墨磁1'],
        '尼2': market_ideal['尼赫鲁']['雷墨磁2'],
        '尼3': market_ideal['尼赫鲁']['雷墨磁3']
    }
    return market_map.get(target_market)

def calculate_deviations(product_torque, product_resistance, target_torque, target_resistance):
    """计算各种可能的偏离度公式"""
    
    # 方法1: 欧几里得距离
    euclidean = math.sqrt((product_torque - target_torque)**2 + (product_resistance - target_resistance)**2)
    
    # 方法2: 曼哈顿距离
    manhattan = abs(product_torque - target_torque) + abs(product_resistance - target_resistance)
    
    # 方法3: 扭矩差绝对值
    torque_diff = abs(product_torque - target_torque)
    
    # 方法4: 电阻差绝对值
    resistance_diff = abs(product_resistance - target_resistance)
    
    # 方法5: 切比雪夫距离 (最大差值)
    chebyshev = max(abs(product_torque - target_torque), abs(product_resistance - target_resistance))
    
    # 方法6: 加权距离 (可能有权重)
    weighted_1 = abs(product_torque - target_torque) * 0.5 + abs(product_resistance - target_resistance) * 0.5
    weighted_2 = abs(product_torque - target_torque) * 0.6 + abs(product_resistance - target_resistance) * 0.4
    weighted_3 = abs(product_torque - target_torque) * 0.4 + abs(product_resistance - target_resistance) * 0.6
    
    # 方法7: 平方差和的平方根 (欧几里得距离的变形)
    squared_sum = (product_torque - target_torque)**2 + (product_resistance - target_resistance)**2
    
    return {
        '欧几里得距离': euclidean,
        '曼哈顿距离': manhattan,
        '扭矩差': torque_diff,
        '电阻差': resistance_diff,
        '切比雪夫距离': chebyshev,
        '加权距离(0.5,0.5)': weighted_1,
        '加权距离(0.6,0.4)': weighted_2,
        '加权距离(0.4,0.6)': weighted_3,
        '平方差和': squared_sum
    }

print("=== 目标市场偏离度分析 ===\n")

# 分析所有有偏离度数据的产品
all_data = []
for group_idx, group in enumerate(products, 1):
    for product_idx, (torque, resistance, target, deviation) in enumerate(group):
        if deviation is not None and target != '无':
            target_coords = get_target_coordinates(target)
            if target_coords:
                target_torque, target_resistance = target_coords
                
                print(f"组序{group_idx} 产品{product_idx+1}:")
                print(f"  产品坐标: ({torque}, {resistance})")
                print(f"  目标市场: {target} -> ({target_torque}, {target_resistance})")
                print(f"  实际偏离度: {deviation}")
                
                # 计算各种可能的偏离度
                deviations = calculate_deviations(torque, resistance, target_torque, target_resistance)
                
                print("  各种计算方法:")
                best_match = None
                best_diff = float('inf')
                
                for method, calculated in deviations.items():
                    diff = abs(calculated - deviation)
                    if diff < best_diff:
                        best_diff = diff
                        best_match = method
                    
                    status = "✅" if diff < 0.01 else "🔶" if diff < 0.05 else "❌"
                    print(f"    {status} {method}: {calculated:.4f} (差异: {diff:.4f})")
                
                print(f"  最佳匹配: {best_match} (差异: {best_diff:.4f})")
                print()
                
                # 保存数据用于后续分析
                all_data.append({
                    'group': group_idx,
                    'product': product_idx + 1,
                    'product_torque': torque,
                    'product_resistance': resistance,
                    'target': target,
                    'target_torque': target_torque,
                    'target_resistance': target_resistance,
                    'actual_deviation': deviation,
                    'best_match': best_match,
                    'best_diff': best_diff,
                    **deviations
                })

# 统计最佳匹配方法
print("=== 统计分析 ===")
method_counts = {}
for data in all_data:
    method = data['best_match']
    if method not in method_counts:
        method_counts[method] = 0
    method_counts[method] += 1

print("各方法的最佳匹配次数:")
for method, count in sorted(method_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {method}: {count} 次")

# 寻找最一致的方法
print("\n=== 最可能的计算公式 ===")
for method in method_counts:
    errors = [data[method] - data['actual_deviation'] for data in all_data]
    avg_error = sum(abs(e) for e in errors) / len(errors)
    max_error = max(abs(e) for e in errors)
    print(f"{method}:")
    print(f"  平均误差: {avg_error:.4f}")
    print(f"  最大误差: {max_error:.4f}")
    if avg_error < 0.02:
        print(f"  🎯 这很可能是正确的公式!")
    print()
