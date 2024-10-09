import React, { useState, useEffect } from 'react';
import Pagination from './Pagination';
import DataFilters from './DataFilters';
import { getAllProcesos, fetchActuaciones, Proceso, Actuacion } from '../services/dataService';
import '../styles/ProcesosList.css';
import { LoadingSpinner } from '../components/LoadingSpinner';

const ProcesosList: React.FC = () => {
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [filteredProcesos, setFilteredProcesos] = useState<Proceso[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedProceso, setExpandedProceso] = useState<number | null>(null);
  const [actuaciones, setActuaciones] = useState<{ [key: number]: Actuacion[] }>({});

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [procesosPerPage] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true)
    getAllProcesos()
      .then((data) => {
        setProcesos(data);
        setFilteredProcesos(data);
      })
      .catch((error) => {
        console.error('Error al obtener los procesos:', error);
      }).finally(() => {
        setIsLoading(false)
      });
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredProcesos(procesos);
    } else {
      const filtered = procesos.filter((proceso) =>
        proceso.sujetosProcesales.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProcesos(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, procesos]);

  const handleExpand = async (idProceso: number) => {
    if (expandedProceso === idProceso) {
      setExpandedProceso(null); // Colapsar si se vuelve a hacer clic
    } else {
      if (!actuaciones[idProceso]) {
        const fetchedActuaciones = await fetchActuaciones(idProceso); // Usar la función importada
        setActuaciones((prev) => ({
          ...prev,
          [idProceso]: fetchedActuaciones,
        }));
      }
      setExpandedProceso(idProceso); // Expandir el nuevo proceso
    }
  };

  const indexOfLastProceso = currentPage * procesosPerPage;
  const indexOfFirstProceso = indexOfLastProceso - procesosPerPage;
  const currentProcesos = filteredProcesos.slice(indexOfFirstProceso, indexOfLastProceso);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="procesos-list">
      <h1>Lista de Procesos</h1>

      <DataFilters
        searchTerm={searchTerm}
        handleSearchChange={handleSearchChange}
        handleSortByFechaRadicacion={() => {}}
        handleSortByUltimaActuacion={() => {}}
      />

      <p>Total de resultados: {filteredProcesos.length}</p>
      {currentProcesos.length > 0 ? (
        <ul className="procesos-ul">
          {currentProcesos.map((proceso) => (
            <li key={proceso.idProceso} className="proceso-item">
              <div className="proceso-header">
                {/* Caret para expandir/colapsar */}
                <span
                  className={`caret ${expandedProceso === proceso.idProceso ? 'caret-down' : 'caret-right'}`}
                  onClick={() => handleExpand(proceso.idProceso)}
                >
                </span>
                <p><strong>ID Proceso:</strong> {proceso.idProceso}</p>
              </div>
              <div className="proceso-columns">
                <div className="proceso-column">
                  <p><strong>Fecha del Proceso:</strong> {new Date(proceso.fechaProceso).toLocaleDateString()}</p>
                  <p><strong>Última Actuación:</strong> {new Date(proceso.fechaUltimaActuacion).toLocaleDateString()}</p>
                </div>
                <div className="proceso-column">
                  <p><strong>Despacho:</strong> {proceso.despacho}</p>
                  <p><strong>Departamento:</strong> {proceso.departamento}</p>
                  <p><strong>Sujetos Procesales:</strong> {proceso.sujetosProcesales}</p>
                </div>
              </div>

              {/* Mostrar las actuaciones si el proceso está expandido */}
              {expandedProceso === proceso.idProceso && actuaciones[proceso.idProceso] && (
                <div className="actuaciones">
                  <h4>Actuaciones</h4>
                  <ul>
                    {actuaciones[proceso.idProceso].map((actuacion) => (
                      <li key={actuacion.idRegActuacion}>
                        <p><strong>Fecha:</strong> {new Date(actuacion.fechaActuacion).toLocaleDateString()}</p>
                        <p><strong>Actuación:</strong> {actuacion.actuacion}</p>
                        <p><strong>Anotación:</strong> {actuacion.anotacion}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>{isLoading ? <LoadingSpinner /> : 'No hay resultados para tu búsqueda.'}</p>
      )}

      {!isLoading &&
        <Pagination
        procesosPerPage={procesosPerPage}
        totalProcesos={filteredProcesos.length}
        paginate={paginate}
        currentPage={currentPage}
      />
      }
    </div>
  );
};

export default ProcesosList;
