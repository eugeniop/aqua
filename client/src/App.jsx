import { useEffect, useState } from 'react';
import LoginForm from './components/LoginForm.jsx';
import SiteList from './components/SiteList.jsx';
import SiteDetail from './components/SiteDetail.jsx';
import { useTranslation } from './i18n/LocalizationProvider.jsx';
import {
  getSites,
  createSite,
  getSiteDetail,
  addWell,
  addTank,
  addFlowmeter,
  recordTankLevel,
  recordFlowmeterReading,
  recordWellMeasurement,
  recordWellMeasurementsBulk,
  setAuthContext
} from './api.js';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [activeSite, setActiveSite] = useState(null);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingSite, setLoadingSite] = useState(false);
  const [error, setError] = useState('');
  const [showSitePanel, setShowSitePanel] = useState(true);
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    loadSites();
  }, [currentUser]);

  const handleLogin = ({ name, role }) => {
    setAuthContext({ name, role });
    setCurrentUser({ name, role });
  };

  const loadSites = async () => {
    setLoadingSites(true);
    setError('');
    if (!currentUser) {
      setLoadingSites(false);
      return;
    }
    try {
      const result = await getSites();
      setSites(result);
      if (result.length > 0) {
        const siteId = selectedSiteId && result.some((item) => item.id === selectedSiteId)
          ? selectedSiteId
          : result[0].id;
        if (siteId !== selectedSiteId) {
          setSelectedSiteId(siteId);
        }
        await loadSiteDetail(siteId);
      } else {
        setActiveSite(null);
        setSelectedSiteId('');
      }
    } catch (err) {
      setError(err.message || t('Unable to load sites'));
    } finally {
      setLoadingSites(false);
    }
  };

  const loadSiteDetail = async (siteId) => {
    if (!siteId) {
      setActiveSite(null);
      return;
    }
    setLoadingSite(true);
    setError('');
    try {
      const detail = await getSiteDetail(siteId);
      setActiveSite(detail);
    } catch (err) {
      setError(err.message || t('Unable to load site'));
    } finally {
      setLoadingSite(false);
    }
  };

  const handleSelectSite = async (siteId) => {
    setSelectedSiteId(siteId);
    await loadSiteDetail(siteId);
  };

  const handleCreateSite = async (payload) => {
    try {
      if (currentUser?.role !== 'admin') {
        throw new Error(t('You do not have permission to create sites.'));
      }
      const newSite = await createSite(payload);
      await loadSites();
      await handleSelectSite(newSite.id);
    } catch (err) {
      throw err;
    }
  };

  const handleRecordTank = async (tankId, payload) => {
    await recordTankLevel(tankId, payload);
    await loadSiteDetail(selectedSiteId);
  };

  const handleRecordFlowmeter = async (flowmeterId, payload) => {
    await recordFlowmeterReading(flowmeterId, payload);
    await loadSiteDetail(selectedSiteId);
  };

  const handleRecordWell = async (wellId, payload) => {
    await recordWellMeasurement(wellId, payload);
    await loadSiteDetail(selectedSiteId);
  };

  const handleRecordWellBulk = async (wellId, payload) => {
    await recordWellMeasurementsBulk(wellId, payload);
    await loadSiteDetail(selectedSiteId);
  };

  const handleAddWell = async (siteId, payload) => {
    await addWell(siteId, payload);
    await loadSiteDetail(siteId);
  };

  const handleAddTank = async (siteId, payload) => {
    await addTank(siteId, payload);
    await loadSiteDetail(siteId);
  };

  const handleAddFlowmeter = async (siteId, payload) => {
    await addFlowmeter(siteId, payload);
    await loadSiteDetail(siteId);
  };

  const toggleSitePanel = () => {
    setShowSitePanel((value) => !value);
  };

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const role = currentUser.role;
  const canCreateSites = role === 'admin';
  const canManageFeatures = role === 'admin';
  const canRecordMeasurements = role === 'admin' || role === 'field-operator';

  return (
    <div className="app-shell">
      {showSitePanel && (
        <SiteList
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelect={handleSelectSite}
          onCreate={handleCreateSite}
          canCreate={canCreateSites}
        />
      )}
      <main className="content">
        <div className="content-header">
          <button type="button" className="toggle-panel" onClick={toggleSitePanel}>
            {showSitePanel ? t('Hide sites') : t('Show sites')}
          </button>
          <div className="settings-panel">
            <div className="settings-title">{t('Settings & Localization')}</div>
            <label>
              {t('languageLabel')}
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="en">{t('english')}</option>
                <option value="sw">{t('swahili')}</option>
              </select>
            </label>
          </div>
        </div>
        {error && <div className="banner error">{error}</div>}
        {loadingSites || loadingSite ? (
          <div className="loading">{t('Loading data…')}</div>
        ) : (
          <SiteDetail
            site={activeSite}
            user={currentUser}
            canManageFeatures={canManageFeatures}
            canRecordMeasurements={canRecordMeasurements}
            onAddWell={handleAddWell}
            onAddTank={handleAddTank}
            onAddFlowmeter={handleAddFlowmeter}
            onRecordTank={handleRecordTank}
            onRecordFlowmeter={handleRecordFlowmeter}
            onRecordWell={handleRecordWell}
            onRecordWellBulk={handleRecordWellBulk}
          />
        )}
      </main>
    </div>
  );
}
