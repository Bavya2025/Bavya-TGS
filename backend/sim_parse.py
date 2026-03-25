import pandas as pd
import io

# Mock data based on screenshot
data = [
    ["Date", "Time", "From Location", "To Location", "Purpose"],
    ["Instructions...", None, None, None, None],
    ["2026-03-25", "10:46", "Head Office", "Field Office", "Site Inspection / Field Visit"],
    ["2026-03-26", None, "Field Office", "Client Site", "Site Inspection / Field Visit"],
    ["2026-03-27", "10:47", "Client Site", "Head Office", "Site Inspection / Field Visit"]
]

df_full = pd.DataFrame(data)

# Simulate backend logic
header_idx = 0
found_header = False
for idx, row in df_full.head(10).iterrows():
    row_vals = [str(c).strip().lower() for c in row if pd.notna(c)]
    if 'date' in row_vals:
        header_idx = idx
        found_header = True
        break

print(f"Header Index: {header_idx}, Found: {found_header}")

df = df_full.iloc[header_idx:].copy()
df.columns = df.iloc[0]
df = df.iloc[1:]

col_map = {}
for col in df.columns:
    if pd.isna(col): continue
    c_str = str(col).strip().lower()
    if 'date' in c_str: col_map['date'] = col
    elif 'time' in c_str: col_map['time'] = col
    elif 'from' in c_str or 'source' in c_str: col_map['from'] = col
    elif 'to' in c_str or 'destination' in c_str: col_map['to'] = col
    elif 'purpose' in c_str or 'intent' in c_str: col_map['purpose'] = col

print(f"Col Map: {col_map}")

rows = []
for _, row in df.iterrows():
    if row.dropna().empty:
        continue
    
    date_raw = row.get(col_map.get('date'))
    if pd.isna(date_raw):
        continue
    
    date_val = str(date_raw).strip()
    if any(kw in date_val.lower() for kw in ['instruc', 'sample', 'date', 'yyyy']):
        continue
    
    if len(date_val) > 10:
        date_val = date_val[:10]

    time_raw = row.get(col_map.get('time'), '')
    time_str = ''
    if pd.notna(time_raw) and str(time_raw).strip() not in ('', 'nan', 'NaT'):
        time_str = str(time_raw).strip()
        try:
            frac = float(time_str)
            if 0 <= frac < 1:
                total_secs = int(frac * 86400)
                time_str = f"{total_secs // 3600:02d}:{(total_secs % 3600) // 60:02d}"
        except:
            pass
        time_str = ':'.join(str(time_str).split(':')[:2]) if ':' in str(time_str) else str(time_str)

    rows.append({
        "date": date_val,
        "time": time_str,
        "mode": "Bike",
        "origin_route": str(row.get(col_map.get('from', ''), '')).strip() if col_map.get('from') else "",
        "destination_route": str(row.get(col_map.get('to', ''), '')).strip() if col_map.get('to') else "",
        "vehicle": "Own Bike",
        "visit_intent": str(row.get(col_map.get('purpose', ''), '')).strip() if col_map.get('purpose') else ""
    })

print(f"Parsed Rows Count: {len(rows)}")
for r in rows:
    print(r)
