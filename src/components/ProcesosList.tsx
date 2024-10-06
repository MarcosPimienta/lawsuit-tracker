import React, { useState, useEffect } from 'react';
import { getProcesos, Proceso } from '../services/dataService';

const ProcesosList: React.FC = () => {
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [filteredProcesos, setFilteredProcesos] = useState<Proceso[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Obtener los procesos desde el API cuando el componente se monta
  useEffect(() => {
    getProcesos().then(data => {
      setProcesos(data);
      setFilteredProcesos(data); // Inicialmente mostramos todos
    }).catch(error => {
      console.error('Error al obtener los procesos:', error);
    });
  }, []);

    // Filtrar los procesos cuando el usuario escribe en la barra de búsqueda
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredProcesos(procesos); // Si no hay término de búsqueda, mostramos todos
    } else {
      const filtered = procesos.filter(proceso =>
        proceso.sujetosProcesales.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProcesos(filtered);
    }
  }, [searchTerm, procesos]);

  // Función para manejar el cambio en la barra de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
  };

  return (
    <div>
      <h1>Lista de Procesos</h1>

      {/* Barra de búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre"
        value={searchTerm}
        onChange={handleSearchChange}
        style={{ padding: '8px', margin: '10px 0', width: '100%' }}
      />

      {/* Mostrar los procesos filtrados */}
      {filteredProcesos.length > 0 ? (
        <ul>
          {filteredProcesos.map((proceso) => (
            <li key={proceso.idProceso} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
              <p><strong>ID Proceso:</strong> {proceso.idProceso}</p>
              <p><strong>Fecha del Proceso:</strong> {new Date(proceso.fechaProceso).toLocaleDateString()}</p>
              <p><strong>Última Actuación:</strong> {new Date(proceso.fechaUltimaActuacion).toLocaleDateString()}</p>
              <p><strong>Despacho:</strong> {proceso.despacho}</p>
              <p><strong>Departamento:</strong> {proceso.departamento}</p>
              <p><strong>Sujetos Procesales:</strong> {proceso.sujetosProcesales}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No se encontraron procesos con el término de búsqueda.</p>
      )}
    </div>
  );
};

export default ProcesosList;
