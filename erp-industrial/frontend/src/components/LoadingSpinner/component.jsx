import './style.css';

export default function LoadingSpinner() {
  return (
    <div className='loading-spinner' role='status' aria-live='polite'>
      <span className='loading-spinner__dot' />
      <span>Carregando...</span>
    </div>
  );
}
