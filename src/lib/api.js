import { API } from './config.js';

const K = 'bn_clave';

async function llamar(params) {
  const r = await fetch(API + '?' + new URLSearchParams(params), { cache: 'no-store' });
  if (!r.ok) throw new Error('Sin conexión');
  return r.json();
}

const memoria = new Map();
const VIDA = 60000; // 60 s

export async function publico(action, params = {}) {
  const k = action + JSON.stringify(params);
  const hit = memoria.get(k);
  if (hit && Date.now() - hit.t < VIDA) return hit.r;
  const r = await llamar({ action, ...params });
  if (!r.error) memoria.set(k, { r, t: Date.now() });
  return r;
}

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