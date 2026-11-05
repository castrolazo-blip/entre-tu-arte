// Condiciones comerciales para artistas (texto de Entre tu Arte).
// Si cambia el texto, sube la VERSION: cada solicitud guarda la versión que aceptó el vendedor.
export const CONDICIONES_VERSION = '2026-11-05'
export const CONDICIONES_FECHA = '2026-11-05'
// La comisión se acuerda con cada artista; este es solo el valor que el panel sugiere al aprobar
export const COMISION_SUGERIDA = 30

export const CONDICIONES = [
  { titulo: 'Objeto del acuerdo', bloques: [
    'Entre tu Arte es una plataforma dedicada a la promoción y comercialización de cuadros y obras de arte decorativo.',
    'Mediante este acuerdo, el artista autoriza a Entre tu Arte a publicar, promocionar y gestionar la venta de las obras que sean previamente aceptadas por la galería.',
    'La relación comercial se desarrolla bajo un modelo de consignación digital, sin que la publicación implique la transferencia de propiedad de las obras.',
  ] },
  { titulo: 'Inscripción y publicación', bloques: [
    ['La inscripción de artistas es gratuita.', 'La publicación de obras no tiene costo inicial.', 'Entre tu Arte se reserva el derecho de seleccionar las obras que formarán parte de su catálogo.', 'Cada obra deberá contar con fotografías de calidad e información completa.', 'La galería podrá solicitar información adicional antes de aprobar una publicación.'],
    'La aceptación de un artista no garantiza la publicación de todas sus obras.',
  ] },
  { titulo: 'Comisión comercial', bloques: [
    'Entre tu Arte recibirá una comisión sobre el precio de venta acordado de cada obra comercializada a través de la plataforma.',
    'El porcentaje de comisión se acordará con el artista para cada obra y se le informará antes de su publicación.',
    'El artista recibirá el monto restante.',
    'Ejemplo de una venta de $500 con una comisión acordada del 30%:',
    ['Artista: $350.', 'Entre tu Arte: $150.'],
    'Los descuentos, impuestos, cargos de procesamiento de pagos y otros costos extraordinarios deberán acordarse antes de aplicarse. Ningún descuento podrá reducir el monto correspondiente al artista sin su autorización.',
  ] },
  { titulo: 'Precio de las obras', bloques: [
    'El precio de publicación será acordado entre el artista y Entre tu Arte.',
    'El artista deberá informar el precio solicitado por cada obra y cualquier modificación posterior.',
    'Entre tu Arte no podrá modificar unilateralmente el precio acordado.',
  ] },
  { titulo: 'Propiedad y custodia', bloques: [
    'Las obras permanecerán físicamente bajo custodia del artista hasta que se concrete su venta y se coordine la entrega.',
    'El artista será responsable de:',
    ['Conservar las obras en buenas condiciones.', 'Protegerlas contra daños, humedad o deterioro.', 'Mantenerlas disponibles mientras estén publicadas.', 'Informar cualquier daño, modificación o pérdida.'],
    'La propiedad de la obra permanecerá con el artista hasta que se complete la operación de compraventa y se efectúe su entrega conforme a las condiciones acordadas.',
  ] },
  { titulo: 'Disponibilidad y exclusividad', bloques: [
    'La relación comercial no exige exclusividad.',
    'El artista podrá comercializar sus obras por otros medios, siempre que informe inmediatamente a Entre tu Arte cuando una obra publicada deje de estar disponible.',
    'Cuando exista una venta confirmada y aceptada por el artista, la obra deberá reservarse para cumplir la operación.',
    'El artista se compromete a no ofrecer simultáneamente una obra ya reservada.',
  ] },
  { titulo: 'Transporte y entrega', bloques: [
    'El costo de transporte de la obra será asumido por el comprador, y deberá informarse antes de confirmar la compra.',
    'Entre tu Arte coordinará con el artista la entrega o recolección de la obra.',
    'El artista deberá:',
    ['Preparar la obra para su transporte.', 'Proporcionar información correcta sobre dimensiones y peso.', 'Entregarla en las condiciones anunciadas.', 'Cumplir los plazos de preparación acordados.'],
    'Las responsabilidades por embalaje, daños durante el transporte, seguro y entrega deberán establecerse según el servicio logístico contratado.',
    'Cualquier costo extraordinario deberá comunicarse y aprobarse previamente.',
  ] },
  { titulo: 'Pagos al artista', bloques: [
    'Entre tu Arte liquidará al artista el monto que le corresponda dentro de los 7 días hábiles posteriores a la confirmación del pago completo del comprador, siempre que se haya cumplido la entrega y no exista una reclamación pendiente que justifique retener temporalmente la liquidación.',
    'El pago se realizará mediante transferencia bancaria u otro medio previamente acordado.',
    'La galería proporcionará un detalle de la operación que incluya precio de venta, comisión y monto liquidado.',
  ] },
  { titulo: 'Autenticidad y derechos de autor', bloques: [
    'El artista declara que:',
    ['Es el autor legítimo de las obras, o cuenta con autorización suficiente para comercializarlas.', 'Las obras no infringen derechos de terceros.', 'La información proporcionada es verdadera.', 'Cualquier reproducción, edición o impresión será identificada correctamente.'],
    'Los derechos de autor permanecerán con sus respectivos titulares.',
    'La comercialización de una obra física no implica la transferencia de sus derechos de reproducción.',
  ] },
  { titulo: 'Fotografías y promoción', bloques: [
    'El artista autoriza a Entre tu Arte, de forma no exclusiva y sin costo adicional, a utilizar fotografías de las obras aceptadas para fines de promoción y comercialización.',
    'Esta autorización comprende:',
    ['Página web.', 'Redes sociales.', 'Catálogos digitales.', 'Publicidad comercial.', 'Presentaciones y material promocional.'],
    'Entre tu Arte procurará identificar al artista en las publicaciones correspondientes.',
    'La autorización no incluye la fabricación o venta de reproducciones sin consentimiento adicional.',
  ] },
  { titulo: 'Devoluciones y reclamaciones', bloques: [
    'Las solicitudes de devolución serán evaluadas individualmente por Entre tu Arte, considerando las circunstancias de cada operación y los derechos aplicables del consumidor.',
    'Se tomarán en cuenta situaciones como:',
    ['Daños durante el transporte.', 'Diferencias significativas entre la obra recibida y la anunciada.', 'Errores en la entrega.', 'Problemas de autenticidad.', 'Otras causas legalmente procedentes.'],
    'Entre tu Arte y el artista colaborarán para resolver las reclamaciones.',
    'La evaluación caso por caso no limitará los derechos irrenunciables del comprador establecidos por la legislación aplicable.',
    'La responsabilidad económica de una devolución se determinará según la causa y las obligaciones de cada parte.',
  ] },
  { titulo: 'Cancelación de operaciones', bloques: [
    'Una vez confirmada una venta, el artista deberá cumplir con la disponibilidad y entrega de la obra.',
    'Si el artista no puede cumplir, deberá comunicarlo inmediatamente a Entre tu Arte.',
    'Las cancelaciones y sus consecuencias se resolverán considerando los compromisos asumidos con el comprador y las responsabilidades de cada parte.',
  ] },
  { titulo: 'Retiro de obras', bloques: [
    'El artista podrá solicitar el retiro de una obra del catálogo, siempre que no exista una venta confirmada o una reserva vigente.',
    'Entre tu Arte podrá retirar publicaciones que contengan información incorrecta, incumplan estas condiciones o afecten la confianza de los compradores.',
    'El retiro de una obra no extingue las obligaciones derivadas de ventas previamente confirmadas.',
  ] },
  { titulo: 'Responsabilidad de las partes', bloques: [
    'El artista responde por la autenticidad, descripción, conservación y disponibilidad de sus obras mientras permanezcan bajo su custodia.',
    'Entre tu Arte responde por las obligaciones que asuma directamente en la promoción, gestión comercial, cobro y coordinación de las operaciones.',
    'Cada parte será responsable de los daños derivados de sus propios incumplimientos, conforme a la legislación aplicable.',
  ] },
  { titulo: 'Duración y terminación', bloques: [
    'La relación comercial tendrá duración indefinida a partir de su aceptación.',
    'Cualquiera de las partes podrá solicitar su terminación mediante comunicación escrita.',
    'Las ventas confirmadas, pagos pendientes y reclamaciones existentes deberán resolverse aun después de finalizar la relación.',
  ] },
  { titulo: 'Datos personales', bloques: [
    'Los datos proporcionados por el artista se utilizarán para gestionar su registro, publicar las obras autorizadas, establecer comunicaciones comerciales y procesar las operaciones correspondientes.',
    'Su tratamiento deberá realizarse conforme a la política de privacidad de Entre tu Arte y la legislación aplicable.',
  ] },
  { titulo: 'Legislación aplicable', bloques: [
    'Estas condiciones se interpretarán conforme a las leyes de la República de El Salvador.',
    'Cualquier controversia se procurará resolver inicialmente mediante comunicación directa entre las partes, sin perjuicio de los derechos y mecanismos legales correspondientes.',
  ] },
  { titulo: 'Aceptación de condiciones', bloques: [
    'Al seleccionar la casilla de aceptación y enviar su solicitud de registro, el artista declara que:',
    ['Ha leído y comprendido estas condiciones.', 'Acepta que la comisión comercial se acuerde para cada obra antes de su publicación.', 'Autoriza la promoción de las obras aprobadas.', 'Confirma la autenticidad de la información proporcionada.', 'Se compromete a mantener actualizada la disponibilidad de sus obras.', 'Acepta las responsabilidades comerciales aquí establecidas.'],
  ] },
]
