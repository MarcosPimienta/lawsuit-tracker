import React, { useState, useEffect } from 'react';
import { getAllProcesos, Proceso } from '../services/dataService';

const ProcesosList: React.FC = () => {
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [filteredProcesos, setFilteredProcesos] = useState<Proceso[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Paginación local
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [procesosPerPage] = useState<number>(10); // Cantidad de procesos por página

  // Obtener los procesos desde el API cuando el componente se monta
  useEffect(() => {
      getAllProcesos().then(data => {
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

          {/* Mostrar los procesos filtrados de la página actual */}
          {currentProcesos.length > 0 ? (
              <ul>
                  {currentProcesos.map((proceso) => (
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

interface PaginationProps {
  procesosPerPage: number;
  totalProcesos: number;
  paginate: (pageNumber: number) => void;
  currentPage: number;
}

const Pagination: React.FC<PaginationProps> = ({ procesosPerPage, totalProcesos, paginate, currentPage }) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalProcesos / procesosPerPage); i++) {
      pageNumbers.push(i);
  }

  return (
      <nav>
          <ul style={{ display: 'flex', justifyContent: 'center', listStyle: 'none', padding: 0 }}>
              {pageNumbers.map(number => (
                  <li key={number} style={{ margin: '0 5px' }}>
                      <button
                          onClick={() => paginate(number)}
                          style={{
                              padding: '8px 12px',
                              backgroundColor: number === currentPage ? '#007bff' : '#fff',
                              color: number === currentPage ? '#fff' : '#000',
                              border: '1px solid #007bff',
                              cursor: 'pointer'
                          }}
                      >
                          {number}
                      </button>
                  </li>
              ))}
          </ul>
      </nav>
  );
};

export default ProcesosList;
