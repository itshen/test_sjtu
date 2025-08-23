#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
计算两点之间的偏离值
作者: 洛小山 (Luoxiaoshan)
"""

import math

# 给定的坐标点
x1, y1 = 4.24, 3.75
x2, y2 = 4.4, 3.8

print("=== 两点坐标 ===")
print(f"点1: ({x1}, {y1})")
print(f"点2: ({x2}, {y2})")
print(f"已知偏离值: 0.16")
print()

# 方法1: 欧几里得距离 (两点间直线距离)
euclidean_distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
print(f"方法1 - 欧几里得距离: {euclidean_distance:.4f}")

# 方法2: 曼哈顿距离 (横纵坐标差的绝对值之和)
manhattan_distance = abs(x2 - x1) + abs(y2 - y1)
print(f"方法2 - 曼哈顿距离: {manhattan_distance:.4f}")

# 方法3: X坐标差的绝对值
x_diff = abs(x2 - x1)
print(f"方法3 - X坐标差: {x_diff:.4f}")

# 方法4: Y坐标差的绝对值
y_diff = abs(y2 - y1)
print(f"方法4 - Y坐标差: {y_diff:.4f}")

# 方法5: 切比雪夫距离 (最大坐标差)
chebyshev_distance = max(abs(x2 - x1), abs(y2 - y1))
print(f"方法5 - 切比雪夫距离: {chebyshev_distance:.4f}")

# 方法6: 坐标差的平方和
sum_of_squares = (x2 - x1)**2 + (y2 - y1)**2
print(f"方法6 - 坐标差平方和: {sum_of_squares:.4f}")

print()
print("=== 分析结果 ===")

# 检查哪个方法最接近0.16
methods = [
    ("欧几里得距离", euclidean_distance),
    ("曼哈顿距离", manhattan_distance),
    ("X坐标差", x_diff),
    ("Y坐标差", y_diff),
    ("切比雪夫距离", chebyshev_distance),
    ("坐标差平方和", sum_of_squares)
]

target = 0.16
closest_method = None
closest_diff = float('inf')

for method_name, value in methods:
    diff = abs(value - target)
    if diff < closest_diff:
        closest_diff = diff
        closest_method = method_name
    
    if abs(value - target) < 0.001:  # 非常接近
        print(f"✅ {method_name} = {value:.4f} (与0.16几乎相等)")
    elif diff < 0.01:  # 比较接近
        print(f"🔶 {method_name} = {value:.4f} (比较接近0.16)")
    else:
        print(f"❌ {method_name} = {value:.4f} (差异较大)")

print(f"\n最接近0.16的方法是: {closest_method}")

# 详细计算过程
print(f"\n=== 详细计算过程 ===")
print(f"X坐标差: {x2} - {x1} = {x2 - x1}")
print(f"Y坐标差: {y2} - {y1} = {y2 - y1}")
print(f"曼哈顿距离 = |{x2 - x1}| + |{y2 - y1}| = {abs(x2 - x1)} + {abs(y2 - y1)} = {manhattan_distance}")
