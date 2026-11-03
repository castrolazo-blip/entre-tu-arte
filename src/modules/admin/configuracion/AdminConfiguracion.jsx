import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { guardarConfig, subirArchivo } from '../adminService.js'
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
  ['Sección "Nuestros artistas"', [
    ['nos_titulo', 'Título', ''],
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
