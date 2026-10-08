import { API } from './config.js';

const K = 'bn_clave';

async function llamar(params) {
  const r = await fetch(API + '?' + new URLSearchParams(params), { cache: 'no-store' });
  if (!r.ok) throw new Error('Sin conexión');
  return r.json();
}

export const publico = (action, params = {}) => llamar({ action, ...params });

export function leerClave() {
  try { return sessionStorage.getItem(K) || localStorage.getItem(K) || ''; }
  catch { return ''; }
}
export function guardarClave(clave, recordar) {
  try { (recordar ? localStorage : sessionStorage).setItem(K, clave); } catch {}
}
export function borrarClave() {
  try { sessionStorage.removeItem(K); localStorage.removeItem(K); } catch {}
}

// Para las vistas de admin y sorteo (usa la clave que se escribe al entrar)
export const admin = (action, params = {}) => llamar({ action, key: leerClave(), ...params });