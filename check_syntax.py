import ast
with open('backend/routers/orders.py') as f:
    ast.parse(f.read())
print('Syntax OK')
