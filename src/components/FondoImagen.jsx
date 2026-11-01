// Sección con una imagen de fondo difuminada y un velo encima para que el texto se lea bien.
export default function FondoImagen({ imagen, velo = 'oscuro', difuminado = 16, className = '', children, ...resto }) {
  const veloClase = velo === 'claro' ? 'bg-crema/85' : velo === 'medio' ? 'bg-[#141210]/55' : 'bg-[#121110]/80'
  return (
    <section className={`relative overflow-hidden ${velo === 'claro' ? 'text-tinta' : 'text-white'} ${className}`} {...resto}>
      {imagen && (
        <img src={imagen} alt="" aria-hidden="true" loading="lazy"
          className="absolute -inset-10 h-[calc(100%+80px)] w-[calc(100%+80px)] max-w-none object-cover"
          style={{ filter: `blur(${difuminado}px)` }} />
      )}
      <span aria-hidden="true" className={`absolute inset-0 ${veloClase}`} />
      <div className="relative">{children}</div>
    </section>
  )
}
