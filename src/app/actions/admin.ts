'use server';
import { revalidatePath } from 'next/cache';
import { act } from './_act';
import { setUserRole, toggleSetting } from '@/application/admin';

export async function setUserRoleAction(userId: string, role: string) {
  return act(async (ctx) => { await setUserRole(ctx, userId, role); revalidatePath('/admin'); });
}
export async function toggleSettingAction(key: string, value: boolean) {
  return act(async (ctx) => { await toggleSetting(ctx, key, value); revalidatePath('/admin'); });
}
