import React from 'react';
import '../styles/DataFilters.css';

interface DataFiltersProps {
  searchTerm: string;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSortByFechaRadicacion: (order: string) => void;
  handleSortByUltimaActuacion: (order: string) => void;
}

const DataFilters: React.FC<DataFiltersProps> = ({
  searchTerm,
  handleSearchChange,
  handleSortByFechaRadicacion,
  handleSortByUltimaActuacion,
}) => {
  return (
    <div className="data-filters">
      {/* Barra de búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre"
        value={searchTerm}
        onChange={handleSearchChange}
        className="search-input"
      />

      {/* Filtro por fecha de radicación */}
      <select
        onChange={(e) => handleSortByFechaRadicacion(e.target.value)}
        className="filter-select"
      >
        <option value="">Fecha de Radicación</option>
        <option value="asc">Más antigua a más reciente</option>
        <option value="desc">Más reciente a más antigua</option>
      </select>

      {/* Filtro por última actuación */}
      <select
        onChange={(e) => handleSortByUltimaActuacion(e.target.value)}
        className="filter-select"
      >
        <option value="">Última Actuación</option>
        <option value="asc">Más antigua a más reciente</option>
        <option value="desc">Más reciente a más antigua</option>
      </select>
    </div>
  );
};

export default DataFilters;
