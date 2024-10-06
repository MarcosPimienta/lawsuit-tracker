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

export default Pagination;