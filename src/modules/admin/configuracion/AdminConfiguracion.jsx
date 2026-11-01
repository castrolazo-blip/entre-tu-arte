import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { guardarConfig } from '../adminService.js'
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
