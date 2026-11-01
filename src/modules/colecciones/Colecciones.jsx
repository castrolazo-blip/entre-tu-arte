import { useEffect, useState } from 'react'
import TarjetasColecciones from './TarjetasColecciones.jsx'
import TituloSeccion from '../../components/TituloSeccion.jsx'
import CargandoModulo from '../../components/CargandoModulo.jsx'
import { listarObras, listarCategorias } from '../catalogo/obrasService.js'

export default function Colecciones() {
  const [datos, setDatos] = useState(null)
  useEffect(() => {
    Promise.all([listarCategorias(), listarObras({ limite: 500 })])
      .then(([categorias, obras]) => setDatos({ categorias, obras }))
      .catch(() => setDatos({ categorias: [], obras: [] }))
  }, [])
  return (
    <div className="contenedor pb-20 pt-28 md:pt-36">
      <TituloSeccion titulo="Colecciones" className="mb-10">
        <p className="mt-5 max-w-xl text-lg text-gris">Explora las obras por estilo y encuentra la que conecta con tu espacio.</p>
      </TituloSeccion>
      {datos ? <TarjetasColecciones categorias={datos.categorias} obras={datos.obras} /> : <CargandoModulo />}
    </div>
  )
}
