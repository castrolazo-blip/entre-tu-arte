export default function CargandoModulo({ texto = 'Cargando…' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-gris">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-mostaza border-t-transparent" />
        <span className="text-sm font-semibold">{texto}</span>
      </div>
    </div>
  )
}
