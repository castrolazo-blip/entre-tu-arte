// Tipo de obra: original o interpretación de otra obra, y si incluye certificado de autenticidad.
export default function SelectorTipoObra({ tipo, inspiradaEn, certificado, onChange }) {
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Tipo de obra" className="grid grid-cols-2 rounded-full bg-crema-clara p-1 ring-1 ring-crema-borde">
        {[['original', 'Obra original'], ['interpretacion', 'Interpretación']].map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={tipo === v}
            onClick={() => onChange({ tipo_obra: v, certificado: v === 'original' ? certificado : false })}
            className={`h-10 rounded-full text-[13px] font-bold ${tipo === v ? 'bg-tinta text-white' : ''}`}>{t}</button>
        ))}
      </div>
      {tipo === 'interpretacion' && (
        <label className="etiqueta">Inspirada en (obra y artista original)
          <input value={inspiradaEn || ''} onChange={e => onChange({ inspirada_en: e.target.value })}
            placeholder="Ej: «La noche estrellada» de Vincent van Gogh" className="campo mt-1.5" />
          <span className="mt-1 block text-xs font-normal text-gris">Se muestra en la tienda para que el cliente sepa que es una interpretación.</span>
        </label>
      )}
      {tipo && (
        <button type="button" role="switch" aria-checked={!!certificado} onClick={() => onChange({ certificado: !certificado })}
          className="flex min-h-[50px] w-full items-center justify-between gap-3 rounded-2xl bg-crema-clara px-4 text-left text-sm font-semibold ring-1 ring-crema-borde">
          Incluye certificado de autenticidad
          <span aria-hidden="true" className={`flex h-7 w-12 shrink-0 rounded-full p-[3px] ${certificado ? 'justify-end bg-tinta' : 'justify-start bg-[#d9d4cb]'}`}><span className="h-[22px] w-[22px] rounded-full bg-white" /></span>
        </button>
      )}
    </div>
  )
}

// Nota para la IA según el tipo de obra
export function notaTipoParaIA(tipo, inspiradaEn) {
  if (tipo === 'interpretacion') return `Esta obra es una interpretación hecha por el artista${inspiradaEn ? `, inspirada en ${inspiradaEn}` : ' de una obra de otro artista'}. No la presentes como una obra original; puedes mencionar con respeto la obra que la inspira.`
  if (tipo === 'original') return 'Es una obra original del artista.'
  return ''
}

// Si la base aún no tiene los campos de tipo, se guarda la obra sin ellos y se avisa.
export const CAMPOS_TIPO = ['tipo_obra', 'inspirada_en', 'certificado', 'piezas', 'medidas_piezas']
export function faltanColumnasTipo(error) {
  const m = String(error?.message || error || '')
  return /tipo_obra|inspirada_en|certificado|piezas/.test(m) && /column|schema cache/i.test(m)
}
export function sinCamposTipo(datos) {
  const copia = { ...datos }
  CAMPOS_TIPO.forEach(c => delete copia[c])
  return copia
}

// Mensaje claro si falta ejecutar la actualización de base de datos
export function mensajeColumnasFaltantes(error) {
  const m = String(error?.message || error || '')
  if (/tipo_obra|inspirada_en|certificado|piezas/.test(m) && /column|schema cache/i.test(m))
    return 'Falta actualizar la base de datos: ejecuta docs/ACTUALIZAR_BASE.sql en Supabase › SQL Editor.'
  return m
}
