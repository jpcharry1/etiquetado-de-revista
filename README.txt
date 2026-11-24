TABLERO DE MARCACIÓN DE VOLÚMENES — versión local

CÓMO ABRIR
1. Descomprime el ZIP en una carpeta.
2. Abre index.html con Chrome o Edge.
3. Para importar archivos Excel (.xlsx/.xls) o CSV, mantén conexión a internet: la librería SheetJS se carga desde un CDN.
4. Los datos se guardan en localStorage del navegador y en ese mismo equipo/perfil de navegador. No hay base de datos ni inicio de sesión.

ARCHIVO DE IMPORTACIÓN
La primera hoja del Excel/CSV debe tener encabezados. Se reconocen estos campos:
- volumen
- artículo (o articulo)
- estado
- fecha de inicio (o fecha inicio)
- fecha de fin (o fecha fin)
- total volumen (opcional): total oficial de artículos de ese volumen.

Estados sugeridos: Marcado, En proceso, Pendiente, Detenido.
Los registros se identifican por la combinación volumen + artículo. Al importar, se agregan los nuevos, se actualizan los que cambiaron y se omiten los que no cambiaron.

NOTAS
- El volumen en curso se toma como el último volumen que aparece en los registros importados.
- Si no incluyes «total volumen», el tablero cuenta las filas de artículos de ese volumen.
- El avance esperado se calcula proporcionalmente al día del mes (día actual / días del mes).
- La alerta roja se activa cuando el avance está más de 15 puntos porcentuales por debajo del esperado o cuando un artículo en proceso supera 7 días.
- El aviso «Demostración con datos ficticios» queda como franja visual de referencia; la aplicación inicia sin registros.
- No uses el botón «Borrar todo» salvo que quieras eliminar los datos guardados en este navegador.

Los archivos fuente son editables: index.html, styles.css y app.js.
