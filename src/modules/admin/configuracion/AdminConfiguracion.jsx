import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { guardarConfig, subirArchivo, conMiniaturas } from '../adminService.js'
import { supabase, BUCKET } from '../../../lib/supabase.js'
import { useConfig } from '../../../context/ConfigContext.jsx'
import { leerClaveIA, guardarClaveIA } from '../publicar/iaService.js'
import EncabezadoAdmin from '../EncabezadoAdmin.jsx'

const GRUPOS = [
  ['Contacto de la galería', [
    ['whatsapp', 'WhatsApp de la galería', '+50312345678'],
    ['email', 'Correo', 'contacto@entretuarte.com'],
    ['instagram', 'Instagram', 'entretuarte'],
    ['facebook', 'Facebook (enlace)', 'https://facebook.com/entretuarte'],
  ]],
  ['Obras por pedido (las vendidas)', [
    ['pedido_tiempo', 'Tiempo de entrega de una obra por pedido', '3 a 4 semanas'],
  ]],
  ['Página "Nuestra historia"', [
    ['nos_titulo', 'Título', 'Nuestra historia'],
    ['nos_lema', 'Frase principal', ''],
    ['nos_resumen', 'Resumen que sale en el inicio', '', true],
    ['nos_p1', 'Párrafo 1', '', true],
    ['nos_p2', 'Párrafo 2', '', true],
    ['nos_p3', 'Párrafo 3', '', true],
    ['nos_p4', 'Párrafo 4', '', true],
    ['nos_cierre', 'Frase de cierre', ''],
  ]],
  ['Tarjeta "Nuestros artistas" (inicio y página de artistas)', [
    ['art_titulo', 'Título', ''],
    ['nos_texto', 'Texto', '', true],
  ]],
]

export default function AdminConfiguracion() {
  const { cfg, recargar } = useConfig()
  const [valores, setValores] = useState({})
  const [clave, setClave] = useState(leerClaveIA() ? '••••••••' : '')
  const [guardando, setGuardando] = useState(false)
  const [diag, setDiag] = useState(null)

  // Revisa paso a paso lo necesario para subir obras y muestra el resultado en pantalla.
  // Crea miniaturas livianas para las fotos de obras que aún no las tienen (la tienda carga más rápido)
  const [optimizando, setOptimizando] = useState(null)   // { hechas, total, fallidas } | null
  async function optimizarFotos() {
    const { data, error } = await supabase.from('fichas').select('id, fotos')
    if (error) { toast.error('No se pudieron leer las obras: ' + error.message); return }
    const pendientes = (data || []).filter(f => Array.isArray(f.fotos) && f.fotos.some(x => x?.url && !x.mini))
    if (!pendientes.length) { toast.success('Todas las fotos ya están optimizadas'); return }
    let hechas = 0, fallidas = 0
    setOptimizando({ hechas, total: pendientes.length, fallidas })
    const cola = [...pendientes]
    await Promise.all([0, 1].map(async () => {
      while (cola.length) {
        const f = cola.shift()
        try {
          const fotos = await conMiniaturas(f.fotos)
          if (!fotos.some((x, i) => x.mini && !f.fotos[i].mini)) throw new Error('sin miniaturas')
          const { error: e } = await supabase.from('fichas').update({ fotos }).eq('id', f.id)
          if (e) throw e
        } catch { fallidas++ }
        hechas++
        setOptimizando({ hechas, total: pendientes.length, fallidas })
      }
    }))
    toast.success(fallidas ? `Listo: ${hechas - fallidas} obras optimizadas, ${fallidas} con error (puedes volver a intentarlo)` : `Listo: ${hechas} obras optimizadas`)
    setOptimizando(null)
  }

  async function diagnosticar() {
    const r = []
    const anotar = (t, ok, detalle) => { r.push({ t, ok, detalle }); setDiag([...r]) }
    setDiag([])
    const { data: s } = await supabase.auth.getSession()
    anotar('Sesión iniciada', !!s.session, s.session?.user?.email || 'No hay sesión')
    const { data: adm, error: eAdm } = await supabase.from('admins').select('user_id').eq('user_id', s.session?.user?.id || '').maybeSingle()
    anotar('Registrado como administrador', !!adm, eAdm ? eAdm.message : adm ? 'Sí' : 'Tu usuario no está en la tabla admins')
    try {
      const c = document.createElement('canvas'); c.width = 8; c.height = 8
      const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.8))
      const url = await subirArchivo('pruebas', new File([blob], 'prueba.jpg', { type: 'image/jpeg' }))
      anotar('Subir fotos al almacenamiento', true, 'Funciona')
      const ruta = url.split(`/object/public/${BUCKET}/`)[1]
      if (ruta) await supabase.storage.from(BUCKET).remove([ruta])
    } catch (err) { anotar('Subir fotos al almacenamiento', false, err.message) }
    const { error: eF } = await supabase.from('fichas').select('existencias, fotos, destacada').limit(1)
    anotar('Base de datos actualizada (migración)', !eF, eF ? eF.message : 'Sí')
  }

  useEffect(() => { setValores(cfg) }, [cfg])

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      for (const [, campos] of GRUPOS) for (const [k] of campos) if ((valores[k] ?? '') !== (cfg[k] ?? '')) await guardarConfig(k, valores[k] ?? '')
      await recargar()
      toast.success('Configuración guardada')
    } catch { toast.error('No se pudo guardar') } finally { setGuardando(false) }
  }

  function guardarClave() {
    if (clave === '••••••••') return
    guardarClaveIA(clave.trim())
    setClave(clave.trim() ? '••••••••' : '')
    toast.success(clave.trim() ? 'Clave de la IA guardada en este dispositivo' : 'Clave borrada de este dispositivo')
  }

  return (
    <>
      <EncabezadoAdmin ruta="Sitio" titulo="Configuración" />
      <form onSubmit={guardar} className="max-w-3xl space-y-5">
        {GRUPOS.map(([titulo, campos]) => (
          <section key={titulo} className="space-y-3.5 rounded-[28px] bg-white p-5 md:p-6">
            <h2 className="text-lg font-bold">{titulo}</h2>
            {campos.map(([k, etiqueta, ph, largo]) => (
              <label key={k} className="etiqueta">{etiqueta}
                {largo
                  ? <textarea rows={3} value={valores[k] ?? ''} onChange={e => setValores(v => ({ ...v, [k]: e.target.value }))} className="campo mt-1.5" />
                  : <input value={valores[k] ?? ''} placeholder={ph} onChange={e => setValores(v => ({ ...v, [k]: e.target.value }))} className="campo mt-1.5" />}
              </label>
            ))}
          </section>
        ))}
        <button disabled={guardando} className="btn-primario">{guardando ? 'Guardando…' : 'Guardar configuración'}</button>
      </form>

      <section className="mt-5 max-w-3xl rounded-[28px] bg-white p-5 md:p-6">
        <h2 className="text-lg font-bold">Velocidad de la tienda</h2>
        <p className="mt-1 text-sm text-gris">Crea una versión liviana de cada foto para las tarjetas y galerías. Las fotos nuevas ya se suben así; esto es para las que ya estaban. Se puede repetir sin problema.</p>
        <button type="button" onClick={optimizarFotos} disabled={!!optimizando} className="btn-primario mt-3 h-12">
          {optimizando ? `Optimizando… ${optimizando.hechas} de ${optimizando.total} obras` : 'Optimizar fotos'}
        </button>
        {optimizando && <div className="mt-3 h-2 rounded-full bg-crema"><div className="h-2 rounded-full bg-tinta transition-all" style={{ width: `${Math.round(optimizando.hechas / optimizando.total * 100)}%` }} /></div>}
      </section>

      <section className="mt-5 max-w-3xl rounded-[28px] bg-white p-5 md:p-6">
        <h2 className="text-lg font-bold">Diagnóstico</h2>
        <p className="mt-1 text-sm text-gris">Revisa si todo está listo para subir obras y fotos.</p>
        <button type="button" onClick={diagnosticar} className="btn-oscuro mt-3 h-12">Probar conexión y subida de fotos</button>
        {diag && (
          <ul className="mt-4 space-y-2">
            {diag.map(d => (
              <li key={d.t} className={`rounded-2xl p-3 text-sm ${d.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
                <span className="font-bold">{d.ok ? '✓' : '✕'} {d.t}</span><span className="block">{d.detalle}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 max-w-3xl rounded-[28px] bg-white p-5 md:p-6">
        <h2 className="text-lg font-bold">Clave de la IA</h2>
        <p className="mt-1 text-sm text-gris">Es la misma clave privada del publicador anterior. Se guarda solo en este dispositivo, nunca en la base de datos.</p>
        <div className="mt-3 flex gap-2.5">
          <label className="sr-only" htmlFor="clave-ia">Clave de la IA</label>
          <input id="clave-ia" type="password" value={clave} onFocus={() => clave === '••••••••' && setClave('')} onChange={e => setClave(e.target.value)} className="campo" />
          <button type="button" onClick={guardarClave} className="btn-oscuro h-12 shrink-0">Guardar</button>
        </div>
      </section>
    </>
  )
}
