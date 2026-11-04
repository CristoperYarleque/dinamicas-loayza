<script>
  import { onDestroy } from 'svelte';
  import { adminGo } from '#lib/api.js';

  let { value = $bindable(null), id, etiqueta, disabled = false } = $props();
  let nombre = $state(''); // texto del buscador: nombre o celular
  let lista = $state([]);
  let buscando = $state(false);
  let creando = $state(false);
  let error = $state('');
  let homonimo = $state(false);
  let permitirHomonimo = $state(false);
  let consultado = $state('');
  let nuevoNombre = $state('');
  let nuevoCelular = $state('');
  let celularExtra = $state('');
  let guardandoCel = $state(false);
  let timer;
  let version = 0;

  const esNumero = (t) => /^[\d\s+]+$/.test(t);
  const oculto = (c) => (c ? '•••' + c.slice(-3) : '');

  function escribir() {
    clearTimeout(timer);
    const turno = ++version;
    value = null;
    lista = [];
    error = '';
    homonimo = false;
    permitirHomonimo = false;
    consultado = '';
    const q = nombre.trim();
    buscando = q.length >= 3;
    if (!buscando) return;
    timer = setTimeout(async () => {
      try {
        const datos = await adminGo(`/participantes?q=${encodeURIComponent(q)}`);
        if (turno !== version) return;
        lista = datos;
        consultado = q;
        // Prellena el alta con lo que se buscó
        if (esNumero(q)) { nuevoCelular = q; nuevoNombre = ''; }
        else { nuevoNombre = q; nuevoCelular = ''; }
      } catch (e) { if (turno === version) error = e.message; }
      finally { if (turno === version) buscando = false; }
    }, 300);
  }

  function elegir(persona) {
    ++version;
    clearTimeout(timer);
    value = persona;
    nombre = persona.nombre;
    lista = [];
    buscando = false;
    error = '';
    celularExtra = '';
  }

  async function crear() {
    if (creando || buscando || consultado !== nombre.trim()) return;
    const n = nuevoNombre.trim();
    if (!confirm(`¿Crear un participante nuevo llamado "${n}"? Revisa antes si ya está registrado.`)) return;
    creando = true;
    error = '';
    try {
      const persona = await adminGo('/participantes', {
        method: 'POST', body: { nombre: n, celular: nuevoCelular.trim(), permitirHomonimo }
      });
      elegir(persona);
    } catch (e) {
      error = e.message;
      homonimo = e.status === 409;
    } finally { creando = false; }
  }

  async function guardarCelular() {
    if (guardandoCel || !value || !celularExtra.trim()) return;
    guardandoCel = true;
    error = '';
    try {
      value = await adminGo(`/participantes/${value.id}/celular`, {
        method: 'PATCH', body: { celular: celularExtra.trim() }
      });
      celularExtra = '';
    } catch (e) { error = e.message; }
    finally { guardandoCel = false; }
  }

  onDestroy(() => { clearTimeout(timer); ++version; });
</script>

<label class="campo" for={id}>{etiqueta}</label>
<input {id} bind:value={nombre} oninput={escribir} placeholder="Nombre o celular"
  autocomplete="off" disabled={disabled || creando} />
{#if buscando}<p class="stats">Buscando participantes…</p>{/if}
{#if lista.length && !value}
  <select aria-label="Seleccionar participante registrado" value="" disabled={disabled || creando}
    onchange={(e) => elegir(lista.find((p) => String(p.id) === e.currentTarget.value))}>
    <option value="" disabled>Selecciona al participante registrado</option>
    {#each lista as p (p.id)}
      <option value={p.id}>{p.nombre} · {p.celular ? '📱 ' + oculto(p.celular) : 'ID ' + p.id}</option>
    {/each}
  </select>
{/if}
{#if value}
  <p class="stats">✅ {value.nombre} · {value.celular ? '📱 ' + oculto(value.celular) : 'ID ' + value.id}</p>
  {#if !value.celular}
    <div class="fila-cel">
      <input type="tel" inputmode="numeric" bind:value={celularExtra} placeholder="📱 Celular (opcional)"
        maxlength="15" autocomplete="off" disabled={disabled || guardandoCel} />
      <button type="button" class="chico" onclick={guardarCelular}
        disabled={disabled || guardandoCel || !celularExtra.trim()}>
        {guardandoCel ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  {/if}
{:else if consultado === nombre.trim() && !buscando}
  <div class="nuevo">
    <p class="stats">
      {lista.length ? 'Selecciona a la persona de la lista o, si es nueva, créala:' : 'No está registrado. Créalo para conservar su historial:'}
    </p>
    <input bind:value={nuevoNombre} placeholder="👤 Nombre y apellido" autocomplete="off"
      disabled={disabled || creando} />
    <input type="tel" inputmode="numeric" bind:value={nuevoCelular} placeholder="📱 Celular (opcional)"
      maxlength="15" autocomplete="off" disabled={disabled || creando} />
    {#if homonimo}
      <label class="campo"><input type="checkbox" bind:checked={permitirHomonimo} disabled={disabled || creando} /> Es otra persona con el mismo nombre</label>
    {/if}
    <button type="button" class="chico" onclick={crear}
      disabled={disabled || creando || nuevoNombre.trim().length < 3 || (homonimo && !permitirHomonimo)}>
      {creando ? 'Creando…' : 'Crear participante nuevo'}
    </button>
  </div>
{/if}
{#if error}<div class="msg err">{error}</div>{/if}

<style>
  .nuevo { display: grid; gap: 8px; margin-top: 4px; }
  .nuevo .stats { margin: 6px 0 0; }
  .nuevo .chico { justify-self: start; }
  .fila-cel { display: flex; gap: 8px; margin-top: 8px; align-items: center; }
  .fila-cel input { flex: 1; min-width: 0; }
</style>
