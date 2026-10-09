<script>
  import { onMount } from 'svelte';
  import { admin, guardarClave, leerClave, borrarClave } from '#lib/api.js';
  import MenuAdmin from './MenuAdmin.svelte';

  let { titulo = '', actual = '', menu = true, children } = $props();

  let listo = $state(false);
  let clave = $state('');
  let recordar = $state(false);
  let error = $state('');
  let cargando = $state(false);
  let verificando = $state(!!leerClave());

  async function validar() {
    try {
      const r = await admin('ping');
      if (r?.ok) return 'ok';
      return r?.error === 'no autorizado' ? 'mal' : 'red';
    } catch {
      return 'red';
    }
  }

    onMount(async () => {
      if (!leerClave()) {
        verificando = false;
        return;
      }
      const v = await validar();
      if (v === 'ok') listo = true;
      else if (v === 'mal') borrarClave();
      else error = 'No pudimos conectar, intenta de nuevo';
      verificando = false;
    });

  async function entrar(e) {
    e.preventDefault();
    if (!clave.trim()) return;
    cargando = true;
    error = '';
    guardarClave(clave.trim(), recordar);
    const v = await validar();
    cargando = false;
    if (v === 'ok') {
      listo = true;
      clave = '';
    } else {
      borrarClave();
      error = v === 'mal' ? 'Clave incorrecta' : 'No pudimos conectar, intenta de nuevo';
    }
  }

  function salir() {
    borrarClave();
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
      <label class="campo" for="clave">Clave</label>
      <input id="clave" type="password" bind:value={clave} autocomplete="current-password" />
      <label class="campo">
        <input type="checkbox" bind:checked={recordar} /> Recordar en este dispositivo
      </label>
      {#if error}<div class="msg err">{error}</div>{/if}
      <button class="btn" disabled={cargando}>{cargando ? 'Verificando…' : 'Entrar'}</button>
    </form>
  </main>
{/if}