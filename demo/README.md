# Prévia de demonstração

Página única que roda o **mesmo domínio** do app (motor de árvores, árvore MIRA, triagem, neutralidade, auditor, relatórios, auditoria) com dados de exemplo em memória. Sem Supabase, sem IA, nada é salvo.

Gerar: `node_modules/.bin/esbuild demo/demo.ts --bundle --format=iife --minify --outfile=/tmp/demo.js` e embutir com `demo/style.css` em `demo/index.html`.
