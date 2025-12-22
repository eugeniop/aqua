import { useEffect, useState } from 'react';
import { auth0Client } from './auth/auth0Client.js';
import SiteList from './components/SiteList.jsx';
import SiteDetail from './components/SiteDetail.jsx';
import UserManagement from './components/UserManagement.jsx';
import TimeZoneSelect from './components/TimeZoneSelect.jsx';
import { useTranslation } from './i18n/LocalizationProvider.jsx';
import './components/LoginForm.css';
import AccessNotice from './components/AccessNotice.jsx';
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
  setAuthContext,
  getUsers,
  createUser,
  updateUserStatus,
  getCurrentUser,
  sendUserInvitation,
  updateCurrentUser
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
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [showSitePanel, setShowSitePanel] = useState(true);
  const [activeView, setActiveView] = useState('sites');
  const [users, setUsers] = useState([]);
  const [userError, setUserError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userNotice, setUserNotice] = useState('');
  const [accessNotice, setAccessNotice] = useState(null);
  const [settingsError, setSettingsError] = useState('');
  const { t, language, setLanguage, timeZone, setTimeZone } = useTranslation();

  useEffect(() => {
    const initializeAuth = async () => {
      setAuthError('');
      try {
        await auth0Client.handleRedirectCallback();
        if (auth0Client.isAuthenticated()) {
          const tokenProvider = () => Promise.resolve(auth0Client.getAccessToken());
          setAuthContext({ name: '', role: '', getToken: tokenProvider });
          try {
            const userProfile = await getCurrentUser();
            setAuthContext({
              name: userProfile.name,
              role: userProfile.role,
              getToken: tokenProvider
            });
            setCurrentUser(userProfile);
            setAccessNotice(null);
          } catch (err) {
            if (err.status === 403 && err.translations) {
              setAccessNotice({ message: err.message, translations: err.translations });
            } else {
              setAuthError(err.message || t('Unable to complete authentication.'));
            }
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        setAuthError(err.message || t('Unable to complete authentication.'));
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, [t]);

  useEffect(() => {
    if (!currentUser || accessNotice) {
      return;
    }
    loadSites();
  }, [currentUser, accessNotice]);

  useEffect(() => {
    if (currentUser?.role !== 'superadmin' || accessNotice) {
      return;
    }
    loadUsers();
  }, [currentUser, accessNotice]);

  useEffect(() => {
    if (currentUser?.role !== 'superadmin' && activeView === 'users') {
      setActiveView('sites');
    }
  }, [activeView, currentUser?.role]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (currentUser.preferredLanguage && currentUser.preferredLanguage !== language) {
      setLanguage(currentUser.preferredLanguage);
    }

    if (currentUser.preferredTimeZone && currentUser.preferredTimeZone !== timeZone) {
      setTimeZone(currentUser.preferredTimeZone);
    }
  }, [currentUser, language, setLanguage, setTimeZone, timeZone]);

  const handleLogin = () => {
    auth0Client.loginWithRedirect().catch((err) => setAuthError(err.message));
  };

  const applyUserUpdate = (updatedUser) => {
    setUsers((prev) => {
      if (!prev.length) {
        return prev;
      }

      const exists = prev.some((user) => user.id === updatedUser.id);
      return exists ? prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)) : prev;
    });

    setCurrentUser((prev) => (prev?.id === updatedUser.id ? { ...prev, ...updatedUser } : prev));
  };

  const handleLogout = () => {
    setAccessNotice(null);
    auth0Client.logout();
  };

  const persistCurrentUserPreferences = async (updates, rollback = {}) => {
    if (!currentUser) {
      return;
    }

    setSettingsError('');
    try {
      const updated = await updateCurrentUser(updates);
      applyUserUpdate(updated);
    } catch (err) {
      setSettingsError(err.message || t('Unable to update preferences.'));

      if (rollback.preferredLanguage) {
        setLanguage(rollback.preferredLanguage);
      }

      if (rollback.preferredTimeZone) {
        setTimeZone(rollback.preferredTimeZone);
      }
    }
  };

  const handleLanguagePreferenceChange = (value) => {
    const previousLanguage = currentUser?.preferredLanguage || language;
    setLanguage(value);
    if (currentUser) {
      persistCurrentUserPreferences({ preferredLanguage: value }, { preferredLanguage: previousLanguage });
    }
  };

  const handleTimeZonePreferenceChange = (value) => {
    const previousTimeZone = currentUser?.preferredTimeZone || timeZone;
    setTimeZone(value);
    if (currentUser) {
      persistCurrentUserPreferences(
        { preferredTimeZone: value },
        { preferredTimeZone: previousTimeZone }
      );
    }
  };

  const loadSites = async () => {
    setLoadingSites(true);
    setError('');
    setAccessNotice(null);
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
      if (err.status === 403 && err.translations) {
        setAccessNotice({ message: err.message, translations: err.translations });
        setActiveSite(null);
        setSites([]);
        setSelectedSiteId('');
      } else {
        setError(err.message || t('Unable to load sites'));
      }
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
    setActiveView('sites');
    setSelectedSiteId(siteId);
    await loadSiteDetail(siteId);
  };

  const handleCreateSite = async (payload) => {
    try {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'superadmin') {
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

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUserError('');
    setUserNotice('');
    try {
      const result = await getUsers();
      setUsers(result);
    } catch (err) {
      setUserError(err.message || t('Unable to load users'));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (payload) => {
    setUserError('');
    try {
      const created = await createUser(payload);
      setUsers((prev) => [created, ...prev.filter((user) => user.id !== created.id)]);
    } catch (err) {
      setUserError(err.message || t('Unable to save user.'));
      throw err;
    }
  };

  const handleToggleUser = async (userId, enabled) => {
    setUserError('');
    try {
      const updated = await updateUserStatus(userId, { enabled });
      applyUserUpdate(updated);
    } catch (err) {
      setUserError(err.message || t('Unable to update user.'));
    }
  };

  const handleChangeUserRole = async (userId, role) => {
    setUserError('');
    try {
      const updated = await updateUserStatus(userId, { role });
      applyUserUpdate(updated);
    } catch (err) {
      setUserError(err.message || t('Unable to update user.'));
    }
  };

  const handleUpdateUserPreferences = async (userId, updates) => {
    setUserError('');
    try {
      const updated = await updateUserStatus(userId, updates);
      applyUserUpdate(updated);
    } catch (err) {
      setUserError(err.message || t('Unable to update user.'));
    }
  };

  const handleInviteUser = async (user) => {
    setUserError('');
    setUserNotice('');
    try {
      await sendUserInvitation(user);
      setUserNotice(t('Invitation sent to {email}', { email: user.email }));
    } catch (err) {
      setUserError(err.message || t('Unable to send invitation.'));
    }
  };

  const toggleSitePanel = () => {
    setShowSitePanel((value) => !value);
  };

  if (authLoading) {
    return <div className="loading">{t('Loading authentication…')}</div>;
  }

  if (accessNotice) {
    return (
      <AccessNotice
        message={accessNotice.message}
        translations={accessNotice.translations}
        onLogout={handleLogout}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="login-container">
        <h1>{t('Aqua Monitor')}</h1>
        <p className="tagline">{t('Capture water production, storage and usage data with confidence.')}</p>
        <div className="card">
          <p>{t('Sign in to continue.')}</p>
          {authError && <p className="error">{authError}</p>}
          <button type="button" onClick={handleLogin}>
            {t('Continue')}
          </button>
        </div>
      </div>
    );
  }

  const role = currentUser.role;
  const isSuperAdmin = role === 'superadmin';
  const canCreateSites = role === 'admin' || isSuperAdmin;
  const canManageFeatures = role === 'admin' || isSuperAdmin;
  const canRecordMeasurements = role === 'admin' || role === 'field-operator' || isSuperAdmin;
  const currentUserId = users.find(
    (user) => user.email?.toLowerCase() === (currentUser.email || '').toLowerCase()
  )?.id;

  return (
    <div className="app-shell">
      {showSitePanel && (
        <SiteList
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelect={handleSelectSite}
          onCreate={handleCreateSite}
          canCreate={canCreateSites}
          showUserManagement={isSuperAdmin}
          onSelectView={setActiveView}
          activeView={activeView}
        />
      )}
      <main className={`content ${activeView === 'users' ? 'users-active' : ''}`}>
        <div className="content-header">
          <button
            type="button"
            className="toggle-panel"
            onClick={toggleSitePanel}
            aria-label={showSitePanel ? t('Hide sites') : t('Show sites')}
          >
            <span className={`chevron ${showSitePanel ? 'left' : 'right'}`} aria-hidden="true" />
          </button>
          <div className="user-session">
            <div className="user-meta">
              <div>{t('Logged in as {name}', { name: currentUser.name || t('Unknown user') })}</div>
              <div className="role">{t('Role: {role}', { role })}</div>
            </div>
            <button type="button" className="secondary" onClick={handleLogout}>
              {t('Log out')}
            </button>
          </div>
          <div className="settings-panel">
            <div className="settings-title">{t('Settings & Localization')}</div>
            <label>
              {t('languageLabel')}
              <select
                value={language}
                onChange={(event) => handleLanguagePreferenceChange(event.target.value)}
              >
                <option value="en">{t('english')}</option>
                <option value="sw">{t('swahili')}</option>
              </select>
            </label>
            <label>
              {t('timeZoneLabel')}
              <TimeZoneSelect
                value={timeZone}
                onChange={handleTimeZonePreferenceChange}
                placeholder={t('Search time zones…')}
              />
            </label>
            {settingsError && <div className="settings-error">{settingsError}</div>}
          </div>
        </div>
        {isSuperAdmin && activeView === 'users' ? (
          <UserManagement
            users={users}
            loading={loadingUsers}
            error={userError}
            onCreate={handleCreateUser}
            onToggle={handleToggleUser}
            onChangeRole={handleChangeUserRole}
            onInvite={handleInviteUser}
            notice={userNotice}
            currentUserId={currentUserId}
            onUpdatePreferences={handleUpdateUserPreferences}
          />
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
