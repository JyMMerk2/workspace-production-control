// Comparador Universal de Fechas a Prueba de Formatos (ISO, M/d/yyyy, YYYY-MM-DD)
const esMismaFechaHoy = (fechaTexto: string): boolean => {
  if (!fechaTexto) return false;

  const hoy = new Date();
  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1; // 0-indexado
  const diaHoy = hoy.getDate();

  // Limpiar cadena quitando la 'T' de tiempo ISO
  let limpia = String(fechaTexto).trim();
  if (limpia.includes('T')) limpia = limpia.split('T')[0];

  let anio = 0, mes = 0, dia = 0;

  if (limpia.includes('-')) {
    // Formato YYYY-MM-DD (ej. 2026-09-07)
    const partes = limpia.split('-');
    if (partes.length === 3) {
      anio = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10);
      dia = parseInt(partes[2], 10);
    }
  } else if (limpia.includes('/')) {
    // Formato M/d/YYYY (ej. 9/7/2026)
    const partes = limpia.split('/');
    if (partes.length === 3) {
      mes = parseInt(partes[0], 10);
      dia = parseInt(partes[1], 10);
      anio = parseInt(partes[2], 10);
    }
  }

  return anio === anioHoy && mes === mesHoy && dia === diaHoy;
};

// Lógica Replicada Actualizar Órdenes del Día
const ejecutarActualizarOrdenesDelDia = () => {
  if (queueResults.length === 0) {
    alert("Error: La hoja 'CustomizationQueue2Results' está vacía. Carga primero el archivo en la pestaña 'QUEUE RESULTS'.");
    return;
  }

  const contratosHoy: string[] = [];

  queueResults.forEach(fila => {
    const dpto = (fila.department || '').trim().toUpperCase();
    if (dpto === 'TEAM SPIRIT (QUEUED)') return;

    // Validación flexible de fecha
    const esDeHoy = esMismaFechaHoy(fila.dueDate);
    const contratoLimpio = (fila.po || '').replace(/[A-Za-z]/g, '').trim();

    if (esDeHoy && contratoLimpio) {
      contratosHoy.push(contratoLimpio);
    }
  });

  const nuevosContratos = Array.from(new Set([...contratosHoy, ...ordenesDelDiaAnotadas]));
  setOrdenesDelDiaAnotadas(nuevosContratos);

  alert(`✅ Órdenes del día actualizadas correctamente.\n\nContratos identificados para HOY: ${contratosHoy.length}\nOmitidos: 'Team Spirit (Queued)'.\nTotal contratos en Órdenes del Día: ${nuevosContratos.length}`);
};
