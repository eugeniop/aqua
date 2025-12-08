import './AssetCards.css';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';

export default function TankCard({ tank, onViewHistory, onAddReading }) {
  const { t, formatDateTime } = useTranslation();
  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{tank.name}</h3>
          <p className="asset-type">{t('Tank')}</p>
          <p className="meta">{t('Capacity: {value} L', { value: tank.capacity?.toLocaleString() })}</p>
          {tank.location && (
            <p className="meta">{t('Location: {location}', { location: tank.location })}</p>
          )}
        </div>
      </header>
      <section className="latest">
        <h4>{t('Latest reading')}</h4>
        {tank.latestReading ? (
          <ul>
            <li>{t('Level: {value} L', { value: tank.latestReading.level })}</li>
            <li>
              {t('Recorded: {value}', {
                value: formatDateTime(tank.latestReading.recordedAt)
              })}
            </li>
            <li>{t('Operator: {name}', { name: tank.latestReading.operator })}</li>
            {tank.latestReading.comment && <li>{t('Notes: {comment}', { comment: tank.latestReading.comment })}</li>}
          </ul>
        ) : (
          <p className="empty">{t('No readings yet.')}</p>
        )}
      </section>
      <div className="card-actions">
        {onAddReading && (
          <button type="button" onClick={() => onAddReading(tank)}>
            {t('Add reading')}
          </button>
        )}
        <button type="button" className="ghost" onClick={() => onViewHistory(tank)}>
          {t('View readings')}
        </button>
      </div>
    </div>
  );
}
