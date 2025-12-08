import './AssetCards.css';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';

export default function FlowmeterCard({ flowmeter, onViewHistory, onAddReading }) {
  const { t, formatDateTime } = useTranslation();
  return (
    <div className="asset-card">
      <header>
        <div>
          <h3>{flowmeter.name}</h3>
          <p className="asset-type">{t('Flowmeter')}</p>
          {flowmeter.location && (
            <p className="meta">{t('Location: {location}', { location: flowmeter.location })}</p>
          )}
        </div>
      </header>
      <section className="latest">
        <h4>{t('Latest reading')}</h4>
        {flowmeter.latestReading ? (
          <ul>
            <li>
              {t('Instantaneous: {value} L/min', {
                value: flowmeter.latestReading.instantaneousFlow
              })}
            </li>
            <li>{t('Totalized volume: {value} L', { value: flowmeter.latestReading.totalizedVolume })}</li>
            <li>
              {t('Recorded: {value}', {
                value: formatDateTime(flowmeter.latestReading.recordedAt)
              })}
            </li>
            <li>{t('Operator: {name}', { name: flowmeter.latestReading.operator })}</li>
            {flowmeter.latestReading.comment && (
              <li>{t('Notes: {comment}', { comment: flowmeter.latestReading.comment })}</li>
            )}
          </ul>
        ) : (
          <p className="empty">{t('No readings yet.')}</p>
        )}
      </section>
      <div className="card-actions">
        {onAddReading && (
          <button type="button" onClick={() => onAddReading(flowmeter)}>
            {t('Add reading')}
          </button>
        )}
        <button type="button" className="ghost" onClick={() => onViewHistory(flowmeter)}>
          {t('View readings')}
        </button>
      </div>
    </div>
  );
}
