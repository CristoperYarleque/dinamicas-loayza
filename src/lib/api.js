import { API, API_GO } from './config.js';
import { writable } from 'svelte/store';

const K = 'bn_clave';
const TOKEN = 'loayza_token';

async function llamar(params) {
  const r = await fetch(API + '?' + new URLSearchParams(params), { cache: 'no-store' });
  if (!r.ok) throw new Error('Sin conexión');
  return r.json();
}

export async function publico(action, params = {}) {
  if (!API_GO) throw new Error('Configura VITE_API_URL con la URL del backend Go');

  let ruta;
  switch (action) {
    case 'buscar': ruta = '/v1/buscar'; break;
    case 'resultados': ruta = '/v1/resultados'; break;
    default: throw new Error('Accion publica desconocida');
  }

  const url = new URL(API_GO + ruta);
  if (action === 'buscar') url.searchParams.set('q', params.q ?? '');

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  });
  const body = await response.json();

  if (!response.ok || body?.code !== 200 || !body.data) {
    const mensaje = Array.isArray(body?.errors) ? body.errors.join(', ') : 'No se pudo consultar el backend';
    throw new Error(mensaje);
  }

  const datos = body.data;
  if (action === 'buscar' && !Array.isArray(datos.resultados)) throw new Error('Respuesta de busqueda invalida');
  if (action === 'resultados' && !Array.isArray(datos.sorteos)) throw new Error('Respuesta de historial invalida');
  return datos;
}

export function leerClave() {
  try { return sessionStorage.getItem(K) || localStorage.getItem(K) || ''; }
  catch { return ''; }
}

export const sesionAdmin = writable(!!leerToken());
export const sesion = writable(!!leerClave() || !!leerToken());

export function guardarClave(clave, recordar) {
  try { (recordar ? localStorage : sessionStorage).setItem(K, clave); } catch {}
  sesion.set(true);
}
export function borrarClave() {
  borrarToken();
  try { sessionStorage.removeItem(K); localStorage.removeItem(K); } catch {}
  sesion.set(false);
}

// Adaptador anterior, reservado para la dinámica hasta su migración.
export const admin = (action, params = {}) => llamar({ action, key: leerClave(), ...params });

// Go: acceso y administración. La dinámica conserva su adaptador anterior.
export function leerToken() {
  try { return sessionStorage.getItem(TOKEN) || localStorage.getItem(TOKEN) || ''; }
  catch { return ''; }
}
export function borrarToken() {
  try { sessionStorage.removeItem(TOKEN); localStorage.removeItem(TOKEN); } catch {}
  sesionAdmin.set(false);
  sesion.set(!!leerClave());
}
export function guardarToken(token, recordar) {
  borrarToken();
  try { (recordar ? localStorage : sessionStorage).setItem(TOKEN, token); }
  catch { throw new Error('El navegador no permite guardar la sesión'); }
  sesionAdmin.set(true);
  sesion.set(true);
}
export async function apiGo(ruta, { method = 'GET', body, privada = true } = {}) {
  if (!API_GO) throw new Error('Configura VITE_API_URL con la URL del backend Go');
  const token = leerToken();
  const headers = { Accept: 'application/json' };
  if (privada) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(API_GO + ruta, {
      method, headers, cache: 'no-store',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
  } catch {
    throw new Error('Sin conexión. Si estabas guardando, revisa la lista antes de repetir.');
  }
  let datos;
  try { datos = await response.json(); }
  catch { throw new Error('El servidor devolvió una respuesta inválida. Revisa la lista antes de repetir.'); }
  if (!response.ok) {
    if (response.status === 401 && privada && leerToken() === token) borrarToken();
    const err = new Error(Array.isArray(datos?.errors) ? datos.errors.join(', ') : 'No se pudo completar la operación');
    err.status = response.status;
    throw err;
  }
  return datos.data;
}
export const adminGo = (ruta, opciones) => apiGo('/v1/admin' + ruta, opciones);
export async function iniciarSesion(username, password, recordar) {
  const datos = await apiGo('/v1/auth/login', {
    method: 'POST', privada: false, body: { username, password }
  });
  if (!datos?.token) throw new Error('El servidor no devolvió el token');
  guardarToken(datos.token, recordar);
}
export function fechaAdmin(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(fecha);
}
