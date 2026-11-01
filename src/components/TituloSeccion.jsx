// Título grande con la línea amarilla, como en el mockup.
export default function TituloSeccion({ titulo, resaltado, antetitulo, children, claro = false, className = '' }) {
  return (
    <div className={className}>
      {antetitulo && <p className={`mb-3 text-[13px] font-bold uppercase tracking-[0.14em] ${claro ? 'text-mostaza' : 'text-gris'}`}>{antetitulo}</p>}
      <h2 className="text-[40px] font-medium leading-[1.02] tracking-[-0.04em] md:text-[60px]">
        {titulo}{resaltado && <> <em className="font-bold text-mostaza">{resaltado}</em></>}
      </h2>
      <span aria-hidden="true" className="acento mt-4" />
      {children}
    </div>
  )
}
