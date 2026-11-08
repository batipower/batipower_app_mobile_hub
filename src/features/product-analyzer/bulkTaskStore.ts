import { useSyncExternalStore } from 'react';

/** Progression d'une action groupée en cours (lancement, relecture EbatPro, DEP…). */
export type BulkTask = {
  label: string;
  done: number;
  total: number;
  errors: number;
};

let task: BulkTask | null = null;
const listeners = new Set<() => void>();

function emit(next: BulkTask | null) {
  task = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBulkTask(): BulkTask | null {
  return useSyncExternalStore(subscribe, () => task, () => task);
}

export function isBulkTaskRunning(): boolean {
  return task !== null;
}

export function startBulkTask(label: string, total: number) {
  emit({ label, done: 0, total, errors: 0 });
}

export function advanceBulkTask(failed = false) {
  if (!task) return;
  emit({ ...task, done: task.done + 1, errors: task.errors + (failed ? 1 : 0) });
}

export function endBulkTask() {
  emit(null);
}
