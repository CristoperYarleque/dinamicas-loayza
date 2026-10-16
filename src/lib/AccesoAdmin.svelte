<script>
  import { onMount } from 'svelte';
  import { adminGo, iniciarSesion, leerToken, borrarToken, sesionAdmin } from '#lib/api.js';
  import MenuAdmin from './MenuAdmin.svelte';

  let { titulo = '', actual = '', menu = true, children } = $props();

  let listo = $state(false);
  let usuario = $state('');
  let clave = $state('');
  let recordar = $state(false);
  let error = $state('');
  let cargando = $state(false);
  let verificando = $state(!!leerToken());

  onMount(async () => {
    if (!leerToken()) { verificando = false; return; }
    try { await adminGo('/me'); listo = true; }
    catch (e) { error = e.status === 401 ? 'La sesión venció. Ingresa nuevamente.' : e.message; }
    finally { verificando = false; }
  });

  $effect(() => {
    if (!$sesionAdmin || !leerToken()) {
      if (listo) error = 'La sesión venció. Ingresa nuevamente.';
      listo = false;
    }
  });

  async function entrar(e) {
    e.preventDefault();
    if (cargando || !usuario.trim() || !clave) return;
    cargando = true;
    error = '';
    try {
      await iniciarSesion(usuario.trim(), clave, recordar);
      listo = true;
      clave = '';
    } catch (e) { error = e.message; }
    finally { cargando = false; }
  }

  function salir() {
    borrarToken();
    listo = false;
  }
</script>

{#if listo}
  <header class="barra">
    <span>{titulo}</span>
    <button onclick={salir}>Salir</button>
  </header>
  {#if menu}<MenuAdmin {actual} />{/if}
  {@render children()}
{:else if verificando}
  <main class="cont">
    <div class="caja">
      <p>⏳ Verificando acceso…</p>
      <p class="stats">Puede tardar unos segundos.</p>
    </div>
  </main>
{:else}
  <main class="cont">
    <form class="caja" onsubmit={entrar}>
      <h1>🔒 Acceso privado</h1>
      <label class="campo" for="usuario">Usuario</label>
      <input id="usuario" bind:value={usuario} autocomplete="username" required />
      <label class="campo" for="clave">Contraseña</label>
      <input id="clave" type="password" bind:value={clave} autocomplete="current-password" required />
      <label class="campo">
        <input type="checkbox" bind:checked={recordar} /> Recordar en este dispositivo
      </label>
      {#if error}<div class="msg err">{error}</div>{/if}
      <button class="btn" disabled={cargando}>{cargando ? 'Verificando…' : 'Entrar'}</button>
    </form>
  </main>
{/if}