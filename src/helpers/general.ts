import { toast } from 'react-toastify';

type SortablePropertyType = string | number;

type KeysWithValsOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: any;
};

export function sortByFnCreator<
  T,
  Key extends KeysWithValsOfType<T, SortablePropertyType>
>(key: Key, asc = true) {
  return (it1: T, it2: T) => {
    const it1Val = it1[key];
    const it2Val = it2[key];

    return asc
      ? it1Val === it2Val
        ? 0
        : it1Val > it2[key]
        ? 1
        : -1
      : it1Val === it2Val
      ? 0
      : it1Val < it2[key]
      ? 1
      : -1;
  };
}

/**
 * Type assertion on const/readonly arrays with resolved type
 */
export function arrayIncludes<T extends U, U>(
  arr: ReadonlyArray<T>,
  el: U
): el is T {
  return arr.includes(el as T);
}

let loadScriptPromises: Record<
  string,
  Optional<{ promise: Promise<any>; domEl: HTMLElement }>
> = {};
/** Loads any script via Promises */
export async function loadScript(scriptId: string, scriptUrl: string) {
  // if script promise already set, return it

  if (loadScriptPromises[scriptId])
    return loadScriptPromises[scriptId]?.promise;

  // add script to the body
  const scriptDomEl = document.createElement('script');
  scriptDomEl.id = scriptId;
  document.body.appendChild(scriptDomEl);
  scriptDomEl.src = scriptUrl;

  const promise = new Promise((resolve, reject) => {
    scriptDomEl.onload = resolve;
    scriptDomEl.onerror = (err) => {
      loadScriptPromises[scriptId] = undefined;
      document.getElementById(scriptId);
      scriptDomEl.remove();
      reject(err);
    };
  });

  loadScriptPromises[scriptId] = { domEl: scriptDomEl, promise };
  return promise;
}

export function handleErrorWithNotifications(err: unknown) {
  let message = '';

  if (!(err instanceof Error)) message = 'Error inesperado';
  else if (err.message === 'DB_NOT_FOUND') message = 'DB No encontrada';
  else if (err.message === 'APP_NOT_AUTHORIZED')
    message = 'Esta App no está autorizada para usar esta DB';
  else if (err.message === 'DB_ALREADY_EXISTS_CANT_CREATE')
    message = 'DB ya existe';
  else if (err.message === 'DB_PARENT_DIR_NOT_FOUND')
    message = 'Directorio no encontrado';
  else message = `Error general: ${err.message}`;

  toast(message, { type: 'error', autoClose: false });
}
