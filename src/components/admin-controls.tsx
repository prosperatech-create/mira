'use client';
import { setUserRoleAction, toggleSettingAction } from '@/app/actions/admin';
import { useServerAction } from '@/components/session/use-action';
import { ErrorText } from '@/components/ui/misc';

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const { pending, error, run } = useServerAction();
  return (
    <div>
      <select aria-label="Papel" disabled={pending} defaultValue={role} onChange={(e) => run(() => setUserRoleAction(userId, e.target.value))} className="rounded-lg border border-sand-300 bg-white px-2 py-1 text-sm">
        <option value="terapeuta">Terapeuta</option>
        <option value="admin">Administrador</option>
      </select>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

export function SettingToggle({ k, value }: { k: string; value: boolean }) {
  const { pending, error, run } = useServerAction();
  return (
    <div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={pending} defaultChecked={value} onChange={(e) => run(() => toggleSettingAction(k, e.target.checked))} className="h-4 w-4 accent-sage-600" />
        {value ? 'Ativado' : 'Desativado'}
      </label>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
