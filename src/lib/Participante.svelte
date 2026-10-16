<script>
  import { onDestroy } from 'svelte';
  import { adminGo } from '#lib/api.js';

  let { value = $bindable(null), id, etiqueta, disabled = false } = $props();
  let nombre = $state('');
  let lista = $state([]);
  let buscando = $state(false);
  let creando = $state(false);
  let error = $state('');
  let homonimo = $state(false);
  let permitirHomonimo = $state(false);
  let consultado = $state('');
  let timer;
  let version = 0;

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
  }

  async function crear() {
    if (creando || buscando || consultado !== nombre.trim()) return;
    if (!confirm(`¿Crear un participante nuevo llamado "${nombre.trim()}"? Revisa antes si ya está registrado.`)) return;
    creando = true;
    error = '';
    try {
      const persona = await adminGo('/participantes', {
        method: 'POST', body: { nombre: nombre.trim(), permitirHomonimo }
      });
      elegir(persona);
    } catch (e) {
      error = e.message;
      homonimo = e.status === 409;
    } finally { creando = false; }
  }

  onDestroy(() => { clearTimeout(timer); ++version; });
</script>

<label class="campo" for={id}>{etiqueta}</label>
<input {id} bind:value={nombre} oninput={escribir} placeholder="Nombre y apellido"
  autocomplete="off" disabled={disabled || creando} />
{#if buscando}<p class="stats">Buscando participantes…</p>{/if}
{#if lista.length && !value}
  <select aria-label="Seleccionar participante registrado" value="" disabled={disabled || creando}
    onchange={(e) => elegir(lista.find((p) => String(p.id) === e.currentTarget.value))}>
    <option value="" disabled>Selecciona al participante registrado</option>
    {#each lista as p (p.id)}<option value={p.id}>{p.nombre} · ID {p.id}</option>{/each}
  </select>
{/if}
{#if value}
  <p class="stats">✅ {value.nombre} · ID {value.id}</p>
{:else if consultado === nombre.trim() && !buscando}
  <p class="stats">Selecciona a la persona de la lista. Si es nueva, créala para conservar su historial.</p>
  {#if homonimo}
    <label class="campo"><input type="checkbox" bind:checked={permitirHomonimo} disabled={disabled || creando} /> Es otra persona con el mismo nombre</label>
  {/if}
  <button type="button" class="chico" onclick={crear}
    disabled={disabled || creando || (homonimo && !permitirHomonimo)}>
    {creando ? 'Creando…' : 'Crear participante nuevo'}
  </button>
{/if}
{#if error}<div class="msg err">{error}</div>{/if}
