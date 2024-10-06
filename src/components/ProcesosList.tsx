import React, { useState, useEffect } from 'react';
import Pagination from './Pagination';
import { getAllProcesos, Proceso } from '../services/dataService';
import '../styles/ProcesosList.css'; // Importar estilos

const ProcesosList: React.FC = () => {
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [filteredProcesos, setFilteredProcesos] = useState<Proceso[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Paginación local
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [procesosPerPage] = useState<number>(10); // Cantidad de procesos por página

  // Obtener los procesos desde el API cuando el componente se monta
  useEffect(() => {
    getAllProcesos()
      .then((data) => {
        setProcesos(data);
        setFilteredProcesos(data); // Inicialmente mostramos todos
      })
      .catch((error) => {
        console.error('Error al obtener los procesos:', error);
      });
  }, []);

  // Filtrar los procesos cuando el usuario escribe en la barra de búsqueda
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredProcesos(procesos); // Si no hay término de búsqueda, mostramos todos
    } else {
      const filtered = procesos.filter((proceso) =>
        proceso.sujetosProcesales.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProcesos(filtered);
      setCurrentPage(1); // Resetear la página actual al filtrar
    }
  }, [searchTerm, procesos]);

  // Función para manejar el cambio en la barra de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Obtener los procesos de la página actual
  const indexOfLastProceso = currentPage * procesosPerPage;
  const indexOfFirstProceso = indexOfLastProceso - procesosPerPage;
  const currentProcesos = filteredProcesos.slice(indexOfFirstProceso, indexOfLastProceso);

  // Cambiar de página
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="procesos-list">
      <h1>Lista de Procesos</h1>

      {/* Barra de búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre"
        value={searchTerm}
        onChange={handleSearchChange}
        className="search-input"
      />

      {/* Mostrar los procesos filtrados de la página actual */}
      {currentProcesos.length > 0 ? (
        <ul className="procesos-ul">
          {currentProcesos.map((proceso) => (
            <li key={proceso.idProceso} className="proceso-item">
              <div className="proceso-columns">
                <div className="proceso-column">
                  <p><strong>ID Proceso:</strong> {proceso.idProceso}</p>
                  <p><strong>Fecha del Proceso:</strong> {new Date(proceso.fechaProceso).toLocaleDateString()}</p>
                  <p><strong>Última Actuación:</strong> {new Date(proceso.fechaUltimaActuacion).toLocaleDateString()}</p>
                </div>
                <div className="proceso-column">
                  <p><strong>Despacho:</strong> {proceso.despacho}</p>
                  <p><strong>Departamento:</strong> {proceso.departamento}</p>
                  <p><strong>Sujetos Procesales:</strong> {proceso.sujetosProcesales}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No se encontraron procesos con el término de búsqueda.</p>
      )}

      {/* Paginación */}
      <Pagination
        procesosPerPage={procesosPerPage}
        totalProcesos={filteredProcesos.length}
        paginate={paginate}
        currentPage={currentPage}
      />
    </div>
  );
};

export default ProcesosList;
