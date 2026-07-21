export interface LoadResult<T> {
  value: T;
  available: boolean;
  message?: string;
}

export interface SaveResult {
  ok: boolean;
  message?: string;
}

export function createPersistentStore<T>(key: string, fallback: T, storage: Storage | undefined = globalThis.localStorage) {
  return {
    load(): LoadResult<T> {
      try {
        const raw = storage?.getItem(key);
        if (!raw) return { value: fallback, available: true };
        return { value: JSON.parse(raw) as T, available: true };
      } catch {
        return {
          value: fallback,
          available: false,
          message: "บันทึกข้อมูลในเครื่องไม่ได้: เปิดโหมดชั่วคราวโดยไม่เขียนทับข้อมูล",
        };
      }
    },
    save(value: T): SaveResult {
      try {
        storage?.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "บันทึกข้อมูลในเครื่องไม่ได้: พื้นที่เต็มหรือเบราว์เซอร์ปิด localStorage",
        };
      }
    },
  };
}
