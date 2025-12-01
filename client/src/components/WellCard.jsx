import './AssetCards.css';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

export default function WellCard({ well, onViewHistory, onAddMeasurement, onAddBulkMeasurement }) {
  const { t } = useTranslation();
  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{well.name}</h3>
          <p className="asset-type">{t('Well')}</p>
          {well.location && (
            <p className="meta">{t('Location: {location}', { location: well.location })}</p>
          )}
        </div>
      </header>
      <section className="latest">
        <h4>{t('Latest measurement')}</h4>
        {well.latestMeasurement ? (
          <ul>
            <li>
              {t('Depth to water: {value} m', {
                value: Number(well.latestMeasurement.depth).toFixed(2)
              })}
            </li>
            <li>{t('Recorded: {value}', { value: formatDate(well.latestMeasurement.recordedAt) })}</li>
            <li>{t('Operator: {name}', { name: well.latestMeasurement.operator })}</li>
            {well.latestMeasurement.comment && (
              <li>{t('Notes: {comment}', { comment: well.latestMeasurement.comment })}</li>
            )}
          </ul>
        ) : (
          <p className="empty">{t('No measurements yet.')}</p>
        )}
      </section>
      <div className="card-actions">
        {onAddBulkMeasurement && (
          <button type="button" className="ghost" onClick={() => onAddBulkMeasurement(well)}>
            {t('Add bulk measurements')}
          </button>
        )}
        {onAddMeasurement && (
          <button type="button" onClick={() => onAddMeasurement(well)}>
            {t('Add measurement')}
          </button>
        )}
        <button type="button" className="ghost" onClick={() => onViewHistory(well)}>
          {t('View measurements')}
        </button>
      </div>
    </div>
  );
}
