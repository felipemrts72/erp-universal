import './style.css';

export default function Card({ title, subtitle, children, rightSlot }) {
  return (
    <section className='card'>
      {(title || rightSlot) && (
        <header className='card__header'>
          <div>
            {title && <h3 className='card__title'>{title}</h3>}
            {subtitle && <p className='card__subtitle'>{subtitle}</p>}
          </div>
          {rightSlot}
        </header>
      )}
      <div className='card__content'>{children}</div>
    </section>
  );
}
