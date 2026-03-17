with open('backend/travel/views.py', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'DashboardStatsView' in line:
            print(f"Line {i+1}: {line.strip()}")
