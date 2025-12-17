const DEFAULT_TIME_ZONE = 'Africa/Dar_es_Salaam';

const FALLBACK_TIME_ZONES = [
  'UTC',
  'Africa/Cairo',
  'Africa/Dar_es_Salaam',
  'Africa/Johannesburg',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/New_York',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Pacific/Auckland'
].sort();

const resolveSupportedTimeZones = () => {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    try {
      const zones = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(zones) && zones.length) {
        return zones;
      }
    } catch (_error) {
      // Fallback list will be used
    }
  }

  return FALLBACK_TIME_ZONES;
};

export const timeZoneOptions = resolveSupportedTimeZones();
export { DEFAULT_TIME_ZONE };
