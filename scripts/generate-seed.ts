/**
 * Gera supabase/seed.sql a partir das fontes TypeScript (árvores e catálogo).
 * Uso: npm run seed:generate
 */
import { writeFileSync } from 'node:fs';
import { SEED_TREES } from '../src/domain/seed/mira-tree';
import { SEED_CHARTS, SEED_INTERVENTIONS, SEED_SETTINGS } from '../src/domain/seed/catalog';
import { validateTree } from '../src/domain/tree-engine';

const q = (v: unknown): string => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v: unknown): string => `${q(JSON.stringify(v))}::jsonb`;
const arr = (v: string[]): string => `array[${v.map(q).join(',')}]::text[]`;

const out: string[] = [
  '-- GERADO AUTOMATICAMENTE por scripts/generate-seed.ts — não edite à mão.',
  '-- Árvores MIRA, catálogo inicial e configurações. Idempotente.',
  'begin;',
];

for (const tree of SEED_TREES) {
  const errors = validateTree(tree);
  if (errors.length) throw new Error(`Árvore ${tree.slug} inválida:\n${errors.join('\n')}`);
  out.push(
    `insert into investigation_trees (id, slug, name, purpose, entry_node_key) values (${q(tree.id)}, ${q(tree.slug)}, ${q(tree.name)}, ${q(tree.purpose)}, ${q(tree.entryNodeKey)})`,
    `on conflict (slug) do update set name = excluded.name, entry_node_key = excluded.entry_node_key, purpose = excluded.purpose;`,
  );
  tree.nodes.forEach((n, i) => {
    out.push(
      `insert into tree_nodes (tree_id, key, stage, kind, category, question, explanation, options, routes, alerts, alternatives, is_anchor, tags, position) values (` +
        [q(tree.id), q(n.key), q(n.stage), q(n.kind), q(n.category), q(n.question), q(n.explanation), j(n.options), j(n.routes), j(n.alerts), j(n.alternatives), n.isAnchor ? 'true' : 'false', arr(n.tags), String(i)].join(', ') +
        `) on conflict (tree_id, key) do update set stage = excluded.stage, kind = excluded.kind, category = excluded.category, question = excluded.question, explanation = excluded.explanation, options = excluded.options, routes = excluded.routes, alerts = excluded.alerts, alternatives = excluded.alternatives, is_anchor = excluded.is_anchor, tags = excluded.tags, position = excluded.position;`,
    );
  });
}

SEED_INTERVENTIONS.forEach((iv, i) => {
  out.push(`insert into interventions (slug, name, requires_chart, position) values (${q(iv.slug)}, ${q(iv.name)}, ${iv.requires_chart}, ${i}) on conflict (slug) do update set name = excluded.name, requires_chart = excluded.requires_chart, position = excluded.position;`);
});

for (const c of SEED_CHARTS) {
  out.push(
    `insert into charts (name, category, traditional_purpose, origin, description, when_used, when_not_used, tags) select ${[q(c.name), q(c.category), q(c.traditional_purpose), q(c.origin), q(c.description), q(c.when_used), q(c.when_not_used), arr(c.tags)].join(', ')} where not exists (select 1 from charts where name = ${q(c.name)});`,
  );
}

for (const s of SEED_SETTINGS) {
  out.push(`insert into settings (key, value, description) values (${q(s.key)}, ${j(s.value)}, ${q(s.description)}) on conflict (key) do nothing;`);
}

out.push('commit;', '');
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n'));
console.log(`seed.sql gerado: ${SEED_TREES.reduce((a, t) => a + t.nodes.length, 0)} nós, ${SEED_INTERVENTIONS.length} intervenções, ${SEED_CHARTS.length} gráficos.`);
