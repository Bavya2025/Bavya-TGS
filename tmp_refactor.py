import re

path = 'c:/Users/User-3/Projects/BTGS/TGS FRONTEND/src/components/trips/DynamicExpenseGrid.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

def replacer(match):
    full = match.group(0)
    func = match.group(2)
    field = match.group(3)
    if 'onBlur' in full:
        return full
    return full + f" onBlur={{e => validateFieldInline(row.id, '{field}', e.target.value)}}"

pattern = r"(onChange=\{e => (updateDetails|updateRow|updateTimeDetails)\(row\.id,\s*'(\w+)',\s*e\.target\.value\)\})"

new_text, count = re.subn(pattern, replacer, text)

print(f'Replaced {count} instances.')

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_text)
