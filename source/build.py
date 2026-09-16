from pathlib import Path
root = Path(__file__).resolve().parent
html = (root / 'shell.html').read_text(encoding='utf-8')
script = (root / 'app.js').read_text(encoding='utf-8')
(root.parent / 'index.html').write_text(html.replace('__APP_SCRIPT__', script), encoding='utf-8')
print('Built index.html')
