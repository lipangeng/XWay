/**
 * 通用工具函数库
 */
export enum AssignMode {
  ERROR = 'error',
  OVERRIDE = 'override',
  KEEP = 'keep',
}

const isMap = (x: unknown): x is ReadonlyMap<any, any> => x instanceof Map;
const ownEnumerableKeys = (o: object): (string | symbol)[] =>
  Reflect.ownKeys(o).filter((k) => Object.getOwnPropertyDescriptor(o, k)?.enumerable) as (string | symbol)[];

export function safeAssign<K, V>(
  target: Map<K, V> | Record<PropertyKey, any>,
  sources: ReadonlyArray<ReadonlyMap<K, V> | Record<PropertyKey, any> | null | undefined> | null | undefined,
  mode: AssignMode = AssignMode.ERROR
): typeof target {
  // 快速检测，无需合并直接返回
  if (sources === null || sources === undefined) return target;
  const setKV = (k: any, v: any) => {
    const exists = isMap(target) ? (target as Map<any, any>).has(k) : Object.prototype.hasOwnProperty.call(target, k);

    if (exists) {
      if (mode === AssignMode.KEEP) return;
      if (mode === AssignMode.ERROR) {
        throw new Error(`[Safe assign Conflict] Duplicate key: "${String(k)}"`);
      }
      // OVERRIDE
      console.warn(`[Safe assign Conflict] Override key: "${String(k)}"`);
    }

    if (isMap(target)) {
      (target as Map<any, any>).set(k, v);
    } else {
      target[k] = v;
    }
  };

  for (const src of sources) {
    if (!src) continue;

    if (isMap(src)) {
      for (const [k, v] of src) setKV(k, v);
    } else {
      for (const k of ownEnumerableKeys(src)) setKV(k, src[k]);
    }
  }

  return target;
}
