import React, { useState, useEffect } from 'react';
import Pagination from './Pagination';
import DataFilters from './DataFilters';
import { getAllProcesos, Proceso } from '../services/dataService';
import '../styles/ProcesosList.css';

const ProcesosList: React.FC = () => {
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [filteredProcesos, setFilteredProcesos] = useState<Proceso[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Paginación local
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [procesosPerPage] = useState<number>(10);

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

  // Función para filtrar los procesos cuando el usuario escribe en la barra de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Filtrar por términos de búsqueda
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredProcesos(procesos);
    } else {
      const filtered = procesos.filter((proceso) =>
        proceso.sujetosProcesales.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProcesos(filtered);
      setCurrentPage(1); // Resetear la página al filtrar
    }
  }, [searchTerm, procesos]);

  // Funciones para ordenar por fecha de radicación
  const handleSortByFechaRadicacion = (order: string) => {
    const sorted = [...filteredProcesos].sort((a, b) => {
      const dateA = new Date(a.fechaProceso).getTime();
      const dateB = new Date(b.fechaProceso).getTime();
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setFilteredProcesos(sorted);
  };

  // Funciones para ordenar por última actuación
  const handleSortByUltimaActuacion = (order: string) => {
    const sorted = [...filteredProcesos].sort((a, b) => {
      const dateA = new Date(a.fechaUltimaActuacion).getTime();
      const dateB = new Date(b.fechaUltimaActuacion).getTime();
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setFilteredProcesos(sorted);
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

      {/* Componente DataFilters con barra de búsqueda y filtros */}
      <DataFilters
        searchTerm={searchTerm}
        handleSearchChange={handleSearchChange}
        handleSortByFechaRadicacion={handleSortByFechaRadicacion}
        handleSortByUltimaActuacion={handleSortByUltimaActuacion}
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
