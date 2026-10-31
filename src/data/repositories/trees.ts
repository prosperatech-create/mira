import { cache } from 'react';
import type { Db } from '../supabase/server';
import type { TreeNodeRow, TreeRow } from '../rows';
import type { InvestigationTree, NodeAlert, NodeOption, Route } from '@/domain/types';
import { notFound } from '@/lib/errors';
import { check } from './_util';

function toTree(t: TreeRow, nodes: TreeNodeRow[]): InvestigationTree {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    purpose: t.purpose,
    entryNodeKey: t.entry_node_key,
    nodes: nodes
      .sort((a, b) => a.position - b.position)
      .map((n) => ({
        key: n.key,
        stage: n.stage,
        kind: n.kind,
        category: n.category,
        question: n.question,
        explanation: n.explanation,
        options: (n.options ?? []) as NodeOption[],
        routes: (n.routes ?? []) as Route[],
        alerts: (n.alerts ?? []) as NodeAlert[],
        alternatives: (n.alternatives ?? []) as string[],
        isAnchor: n.is_anchor,
        tags: n.tags ?? [],
        position: n.position,
      })),
  };
}

async function load(db: Db, column: 'slug' | 'id', value: string): Promise<InvestigationTree> {
  const { data: t, error } = await db.from('investigation_trees').select('*').eq(column, value).maybeSingle();
  check(error, 'trees.get');
  if (!t) throw notFound(`Árvore "${value}"`);
  const { data: nodes, error: e2 } = await db.from('tree_nodes').select('*').eq('tree_id', (t as TreeRow).id);
  check(e2, 'trees.nodes');
  return toTree(t as TreeRow, (nodes ?? []) as TreeNodeRow[]);
}

/** Memoizado por requisição (React cache). */
export const getTreeBySlug = cache((db: Db, slug: string) => load(db, 'slug', slug));
export const getTreeById = cache((db: Db, id: string) => load(db, 'id', id));

export async function listTrees(db: Db): Promise<(TreeRow & { node_count: number })[]> {
  const { data, error } = await db.from('investigation_trees').select('*, tree_nodes(count)').order('slug');
  check(error, 'trees.list');
  return ((data ?? []) as (TreeRow & { tree_nodes: { count: number }[] })[]).map((t) => ({ ...t, node_count: t.tree_nodes?.[0]?.count ?? 0 }));
}
