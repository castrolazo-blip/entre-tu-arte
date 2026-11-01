export default function EncabezadoAdmin({ ruta, titulo, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 px-1 pt-2">
      <div>
        {ruta && <p className="text-sm text-gris">{ruta}</p>}
        <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.035em] md:text-[38px]">{titulo}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  )
}
