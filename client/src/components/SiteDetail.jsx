import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';
import TankCard from './TankCard.jsx';
import FlowmeterCard from './FlowmeterCard.jsx';
import WellCard from './WellCard.jsx';
import Modal from './Modal.jsx';
import HistoryChart from './HistoryChart.jsx';
import {
  getTankReadings,
  getFlowmeterReadings,
  getWellMeasurements,
  deleteTankReading,
  deleteFlowmeterReading,
  deleteWellMeasurement
} from '../api.js';
import './SiteDetail.css';

const defaultTimestamp = () => new Date().toISOString().slice(0, 16);

const HISTORY_PAGE_SIZE = 5;

const defaultVisibleTypes = {
  well: true,
  tank: true,
  flowmeter: true
};

const historyFetchers = {
  well: getWellMeasurements,
  tank: getTankReadings,
  flowmeter: getFlowmeterReadings
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '—');

const historyColumns = {
  well: [
    {
      key: 'depth',
      label: 'Depth (m)',
      render: (item) => (item.depth == null ? '—' : Number(item.depth).toFixed(2))
    },
    {
      key: 'recordedAt',
      label: 'Recorded at',
      render: (item) => formatDateTime(item.recordedAt)
    },
    { key: 'operator', label: 'Operator', render: (item) => item.operator || '—' },
    {
      key: 'comment',
      label: 'Comment',
      render: (item) => (item.comment ? item.comment : '—')
    }
  ],
  tank: [
    {
      key: 'level',
      label: 'Level (L)',
      render: (item) =>
        item.level == null ? '—' : Number(item.level).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    {
      key: 'recordedAt',
      label: 'Recorded at',
      render: (item) => formatDateTime(item.recordedAt)
    },
    { key: 'operator', label: 'Operator', render: (item) => item.operator || '—' },
    {
      key: 'comment',
      label: 'Comment',
      render: (item) => (item.comment ? item.comment : '—')
    }
  ],
  flowmeter: [
    {
      key: 'instantaneousFlow',
      label: 'Instantaneous (L/min)',
      render: (item) =>
        item.instantaneousFlow == null
          ? '—'
          : Number(item.instantaneousFlow).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })
    },
    {
      key: 'totalizedVolume',
      label: 'Totalized volume (L)',
      render: (item) =>
        item.totalizedVolume == null
          ? '—'
          : Number(item.totalizedVolume).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })
    },
    {
      key: 'recordedAt',
      label: 'Recorded at',
      render: (item) => formatDateTime(item.recordedAt)
    },
    { key: 'operator', label: 'Operator', render: (item) => item.operator || '—' },
    {
      key: 'comment',
      label: 'Comment',
      render: (item) => (item.comment ? item.comment : '—')
    }
  ]
};

const chartSeriesConfig = {
  well: [
    { key: 'depth', label: 'Depth (m)', color: '#2563eb' }
  ],
  tank: [
    { key: 'level', label: 'Level (L)', color: '#16a34a' }
  ],
  flowmeter: [
    { key: 'instantaneousFlow', label: 'Instantaneous flow (L/min)', color: '#0ea5e9' },
    { key: 'totalizedVolume', label: 'Totalized volume (L)', color: '#9333ea' }
  ]
};

const initialHistoryState = {
  loading: false,
  error: '',
  items: [],
  total: 0,
  limit: HISTORY_PAGE_SIZE,
  operators: []
};

export default function SiteDetail({
  site,
  user,
  canManageFeatures = false,
  canRecordMeasurements = false,
  onAddWell,
  onAddTank,
  onAddFlowmeter,
  onRecordTank,
  onRecordFlowmeter,
  onRecordWell
}) {
  const { t } = useTranslation();
  const typeLabels = useMemo(
    () => ({
      well: t('Well'),
      tank: t('Tank'),
      flowmeter: t('Flowmeter')
    }),
    [t]
  );

  const roleLabels = useMemo(
    () => ({
      admin: t('Admin'),
      'field-operator': t('Field operator'),
      analyst: t('Analyst')
    }),
    [t]
  );

  const historyTypeLabels = useMemo(
    () => ({
      well: t('Measurements'),
      tank: t('Readings'),
      flowmeter: t('Readings')
    }),
    [t]
  );

  const filterLabels = useMemo(
    () => ({
      well: t('Wells'),
      tank: t('Tanks'),
      flowmeter: t('Flowmeters')
    }),
    [t]
  );

  const historyColumns = useMemo(
    () => ({
      well: [
        {
          key: 'depth',
          label: t('Depth (m)'),
          render: (item) => (item.depth == null ? '—' : Number(item.depth).toFixed(2))
        },
        {
          key: 'recordedAt',
          label: t('Recorded at'),
          render: (item) => formatDateTime(item.recordedAt)
        },
        { key: 'operator', label: t('Operator'), render: (item) => item.operator || '—' },
        {
          key: 'comment',
          label: t('Comment'),
          render: (item) => (item.comment ? item.comment : '—')
        }
      ],
      tank: [
        {
          key: 'level',
          label: t('Level (L)'),
          render: (item) =>
            item.level == null ? '—' : Number(item.level).toLocaleString(undefined, { maximumFractionDigits: 2 })
        },
        {
          key: 'recordedAt',
          label: t('Recorded at'),
          render: (item) => formatDateTime(item.recordedAt)
        },
        { key: 'operator', label: t('Operator'), render: (item) => item.operator || '—' },
        {
          key: 'comment',
          label: t('Comment'),
          render: (item) => (item.comment ? item.comment : '—')
        }
      ],
      flowmeter: [
        {
          key: 'instantaneousFlow',
          label: t('Instantaneous (L/min)'),
          render: (item) =>
            item.instantaneousFlow == null
              ? '—'
              : Number(item.instantaneousFlow).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
        },
        {
          key: 'totalizedVolume',
          label: t('Totalized volume (L)'),
          render: (item) =>
            item.totalizedVolume == null
              ? '—'
              : Number(item.totalizedVolume).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
        },
        {
          key: 'recordedAt',
          label: t('Recorded at'),
          render: (item) => formatDateTime(item.recordedAt)
        },
        { key: 'operator', label: t('Operator'), render: (item) => item.operator || '—' },
        {
          key: 'comment',
          label: t('Comment'),
          render: (item) => (item.comment ? item.comment : '—')
        }
      ]
    }),
    [t]
  );

  const historyChartSeries = useMemo(
    () => ({
      well: [{ key: 'depth', label: t('Depth (m)'), color: '#f97316' }],
      tank: [{ key: 'level', label: t('Level (L)'), color: '#16a34a' }],
      flowmeter: [
        { key: 'instantaneousFlow', label: t('Instantaneous flow (L/min)'), color: '#0ea5e9' },
        { key: 'totalizedVolume', label: t('Totalized volume (L)'), color: '#9333ea' }
      ]
    }),
    [t]
  );
  const userName = (user?.name || '').trim();
  const userRole = user?.role || '';
  const userRoleLabel = roleLabels[userRole] || 'Unknown role';
  const displayUserName = userName || 'Unknown operator';
  const defaultOperatorFilter = () => userName;

  const [createModal, setCreateModal] = useState(null);
  const [createForm, setCreateForm] = useState({});
  const [createError, setCreateError] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [recordModal, setRecordModal] = useState(null);
  const [recordForm, setRecordForm] = useState({});
  const [recordError, setRecordError] = useState('');
  const [recordSubmitting, setRecordSubmitting] = useState(false);

  const [visibleTypes, setVisibleTypes] = useState(() => ({ ...defaultVisibleTypes }));
  const [historyModal, setHistoryModal] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyState, setHistoryState] = useState(() => ({ ...initialHistoryState }));
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const [historyDeletingId, setHistoryDeletingId] = useState(null);
  const [historyView, setHistoryView] = useState('table');
  const [chartForm, setChartForm] = useState({ from: '', to: '' });
  const [chartState, setChartState] = useState({ loading: false, error: '', items: [] });
  const [historyFilterForm, setHistoryFilterForm] = useState({
    from: '',
    to: '',
    operator: defaultOperatorFilter()
  });
  const [historyFilters, setHistoryFilters] = useState({
    from: '',
    to: '',
    operator: defaultOperatorFilter()
  });
  const [historyControlsError, setHistoryControlsError] = useState('');
  const [historyDownloading, setHistoryDownloading] = useState(false);

  const canDeleteHistoryItem = (item) => {
    if (userRole === 'admin') {
      return true;
    }
    if (userRole === 'field-operator') {
      const entryOperator = item.operator?.trim();
      return entryOperator && userName && entryOperator === userName;
    }
    return false;
  };

  useEffect(() => {
    if (!canManageFeatures) {
      setCreateModal(null);
      setCreateError('');
      setCreateForm({});
      setCreateSubmitting(false);
    }
  }, [canManageFeatures]);

  useEffect(() => {
    if (!canRecordMeasurements) {
      setRecordModal(null);
      setRecordError('');
      setRecordForm({});
      setRecordSubmitting(false);
    }
  }, [canRecordMeasurements]);

  useEffect(() => {
    setCreateModal(null);
    setRecordModal(null);
    setCreateForm({});
    setRecordForm({});
    setCreateError('');
    setRecordError('');
    setCreateSubmitting(false);
    setRecordSubmitting(false);
    setVisibleTypes({ ...defaultVisibleTypes });
    setHistoryModal(null);
    setHistoryPage(1);
    setHistoryState({ ...initialHistoryState });
    setHistoryReloadToken(0);
    setHistoryDeletingId(null);
    setHistoryFilterForm({ from: '', to: '', operator: defaultOperatorFilter() });
    setHistoryFilters({ from: '', to: '', operator: defaultOperatorFilter() });
    setHistoryControlsError('');
    setHistoryDownloading(false);
  }, [site?.id]);

  const features = useMemo(() => {
    if (!site) {
      return [];
    }

    const grouped = [
      ...site.wells.map((well) => ({ type: 'well', data: well })),
      ...site.tanks.map((tank) => ({ type: 'tank', data: tank })),
      ...site.flowmeters.map((flowmeter) => ({ type: 'flowmeter', data: flowmeter }))
    ];

    const order = { well: 0, tank: 1, flowmeter: 2 };

    return grouped.sort((a, b) => {
      if (order[a.type] !== order[b.type]) {
        return order[a.type] - order[b.type];
      }
      return a.data.name.localeCompare(b.data.name);
    });
  }, [site]);

  const filteredFeatures = useMemo(
    () => features.filter((feature) => visibleTypes[feature.type]),
    [features, visibleTypes]
  );

  useEffect(() => {
    if (!historyModal) {
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      setHistoryState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const fetchHistory = historyFetchers[historyModal.type];
        if (!fetchHistory) {
          throw new Error(t('Unsupported feature type'));
        }
        const params = {
          page: historyPage,
          limit: HISTORY_PAGE_SIZE
        };
        if (historyFilters.operator) {
          params.operator = historyFilters.operator;
        }
        if (historyFilters.from) {
          const fromDate = new Date(historyFilters.from);
          if (!Number.isNaN(fromDate.getTime())) {
            params.from = fromDate.toISOString();
          }
        }
        if (historyFilters.to) {
          const toDate = new Date(historyFilters.to);
          if (!Number.isNaN(toDate.getTime())) {
            params.to = toDate.toISOString();
          }
        }

        const result = await fetchHistory(historyModal.feature.id, params);
        if (cancelled) {
          return;
        }
        if ((result.items?.length ?? 0) === 0 && historyPage > 1 && (result.total ?? 0) > 0) {
          setHistoryPage((prev) => Math.max(1, prev - 1));
          return;
        }
        setHistoryState({
          loading: false,
          error: '',
          items: result.items ?? [],
          total: result.total ?? 0,
          limit: result.limit ?? HISTORY_PAGE_SIZE,
          operators: result.operators ?? []
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setHistoryState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || t('Unable to load history')
        }));
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [historyModal, historyPage, historyReloadToken, historyFilters]);

  const toggleType = (type) => {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const openHistoryModal = (type, feature) => {
    setHistoryPage(1);
    setHistoryModal({ type, feature });
    setHistoryView('table');
    setChartForm({ from: '', to: '' });
    setChartState({ loading: false, error: '', items: [] });
    setHistoryFilterForm({ from: '', to: '', operator: defaultOperatorFilter() });
    setHistoryFilters({ from: '', to: '', operator: defaultOperatorFilter() });
    setHistoryControlsError('');
    setHistoryDownloading(false);
  };

  const closeHistoryModal = () => {
    setHistoryModal(null);
    setHistoryPage(1);
    setHistoryState({ ...initialHistoryState });
    setHistoryReloadToken(0);
    setHistoryDeletingId(null);
    setHistoryView('table');
    setChartForm({ from: '', to: '' });
    setChartState({ loading: false, error: '', items: [] });
    setHistoryFilterForm({ from: '', to: '', operator: defaultOperatorFilter() });
    setHistoryFilters({ from: '', to: '', operator: defaultOperatorFilter() });
    setHistoryControlsError('');
    setHistoryDownloading(false);
  };

  const handleHistoryPrevious = () => {
    setHistoryPage((prev) => Math.max(1, prev - 1));
  };

  const handleHistoryNext = () => {
    setHistoryPage((prev) => prev + 1);
  };

  const totalHistoryPages = historyModal
    ? Math.max(1, Math.ceil((historyState.total || 0) / (historyState.limit || HISTORY_PAGE_SIZE)))
    : 1;
  const historyHasPrevious = historyModal ? historyPage > 1 : false;
  const historyHasNext = historyModal ? historyPage < totalHistoryPages : false;
  const historyRangeStart =
    historyModal && historyState.total > 0
      ? (historyPage - 1) * historyState.limit + 1
      : 0;
  const historyRangeEnd =
    historyModal && historyState.total > 0
      ? Math.min(
          (historyPage - 1) * historyState.limit + historyState.items.length,
          historyState.total
        )
      : 0;
  const historySummaryLabel = historyModal ? historyTypeLabels[historyModal.type].toLowerCase() : '';
  const historyOperators = useMemo(() => {
    const options = new Set(historyState.operators || []);
    if (userName) {
      options.add(userName);
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [historyState.operators, userName]);

  const historyDeleteHandlers = {
    well: deleteWellMeasurement,
    tank: deleteTankReading,
    flowmeter: deleteFlowmeterReading
  };

  const handleHistoryDelete = async (item) => {
    if (!historyModal) {
      return;
    }

    if (!canDeleteHistoryItem(item)) {
      setHistoryState((prev) => ({
        ...prev,
        error: t('You do not have permission to delete this entry.')
      }));
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this entry? This cannot be undone.');
    if (!confirmDelete) {
      return;
    }

    const deleteHandler = historyDeleteHandlers[historyModal.type];
    if (!deleteHandler) {
      setHistoryState((prev) => ({ ...prev, error: t('Unable to delete entry') }));
      return;
    }

    setHistoryDeletingId(item.id);
    setHistoryState((prev) => ({ ...prev, error: '' }));

    try {
      await deleteHandler(historyModal.feature.id, item.id);
      setHistoryReloadToken((prev) => prev + 1);
  } catch (error) {
    setHistoryState((prev) => ({
      ...prev,
      error: error.message || t('Unable to delete entry')
    }));
  } finally {
      setHistoryDeletingId(null);
    }
  };

  const handleHistoryFilterFormChange = (field) => (event) => {
    const { value } = event.target;
    setHistoryFilterForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleHistoryFilterSubmit = (event) => {
    event.preventDefault();
    if (!historyModal) {
      return;
    }

    const { from, to, operator } = historyFilterForm;
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (fromDate > toDate) {
        setHistoryControlsError(t('“From” date must be before “to” date.'));
        return;
      }
    }

    setHistoryControlsError('');
    setHistoryFilters({ from, to, operator });
    setHistoryPage(1);
  };

  const handleHistoryFilterReset = () => {
    setHistoryFilterForm({ from: '', to: '', operator: defaultOperatorFilter() });
    setHistoryFilters({ from: '', to: '', operator: defaultOperatorFilter() });
    setHistoryControlsError('');
    setHistoryPage(1);
  };

  const handleHistoryOperatorSelect = (operator) => {
    setHistoryFilterForm((prev) => ({ ...prev, operator }));
    setHistoryFilters((prev) => ({ ...prev, operator }));
    setHistoryControlsError('');
    setHistoryPage(1);
  };

  const handleDownloadCsv = async () => {
    if (!historyModal) {
      return;
    }

    const fetchHistory = historyFetchers[historyModal.type];
    if (!fetchHistory) {
      setHistoryControlsError(t('Unable to download history for this feature.'));
      return;
    }

    setHistoryControlsError('');
    setHistoryDownloading(true);

    try {
      const params = { page: 1, limit: 500, order: 'desc' };
      if (historyFilters.operator) {
        params.operator = historyFilters.operator;
      }
      if (historyFilters.from) {
        const fromDate = new Date(historyFilters.from);
        if (!Number.isNaN(fromDate.getTime())) {
          params.from = fromDate.toISOString();
        }
      }
      if (historyFilters.to) {
        const toDate = new Date(historyFilters.to);
        if (!Number.isNaN(toDate.getTime())) {
          params.to = toDate.toISOString();
        }
      }

      const result = await fetchHistory(historyModal.feature.id, params);
      const items = result.items ?? [];

      if (items.length === 0) {
        setHistoryControlsError(t('No rows available for the selected filters.'));
        return;
      }

      const columns = historyColumns[historyModal.type] ?? [];
      if (columns.length === 0) {
        setHistoryControlsError(t('No columns available for export.'));
        return;
      }

      const escapeValue = (value) => {
        if (value == null) {
          return '""';
        }
        const stringValue = String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      };

      const headerRow = columns.map((column) => escapeValue(column.label)).join(',');
      const dataRows = items.map((item) =>
        columns
          .map((column) => {
            const rendered = column.render ? column.render(item) : item[column.key];
            return escapeValue(rendered ?? '');
          })
          .join(',')
      );
      const csvContent = [headerRow, ...dataRows].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = `${historyModal.feature.name}-${historyTypeLabels[historyModal.type] || 'history'}-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}`
        .replace(/\s+/g, '_');
      link.href = url;
      link.setAttribute('download', `${safeName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setHistoryControlsError(error.message || t('Unable to download CSV.'));
    } finally {
      setHistoryDownloading(false);
    }
  };

  const loadChartData = async ({ from: overrideFrom, to: overrideTo } = {}) => {
    if (!historyModal) {
      return;
    }

    const currentHistory = historyModal;
    const fromValue = overrideFrom !== undefined ? overrideFrom : chartForm.from;
    const toValue = overrideTo !== undefined ? overrideTo : chartForm.to;

    if (fromValue && toValue) {
      const fromDate = new Date(fromValue);
      const toDate = new Date(toValue);
      if (fromDate > toDate) {
        setChartState((prev) => ({ ...prev, loading: false, error: t('“From” date must be before “to” date.') }));
        return;
      }
    }

    setChartState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const fetchHistory = historyFetchers[currentHistory.type];
      if (!fetchHistory) {
        throw new Error(t('Unsupported feature type'));
      }

      const params = { page: 1, limit: 500, order: 'asc' };
      if (fromValue) {
        const fromDate = new Date(fromValue);
        if (!Number.isNaN(fromDate.getTime())) {
          params.from = fromDate.toISOString();
        }
      }
      if (toValue) {
        const toDate = new Date(toValue);
        if (!Number.isNaN(toDate.getTime())) {
          params.to = toDate.toISOString();
        }
      }

      const result = await fetchHistory(currentHistory.feature.id, params);
      if (
        !historyModal ||
        historyModal.feature.id !== currentHistory.feature.id ||
        historyModal.type !== currentHistory.type
      ) {
        return;
      }
      setChartState({ loading: false, error: '', items: result.items ?? [] });
    } catch (error) {
      setChartState({
        loading: false,
        error: error.message || t('Unable to load chart data'),
        items: []
      });
    }
  };

  const handleChartFormChange = (field) => (event) => {
    const { value } = event.target;
    setChartForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChartSubmit = async (event) => {
    event.preventDefault();
    await loadChartData();
  };

  const handleChartReset = async () => {
    setChartForm({ from: '', to: '' });
    await loadChartData({ from: '', to: '' });
  };

  const handleShowChart = async () => {
    setHistoryView('chart');
    setHistoryControlsError('');
    await loadChartData();
  };

  const handleShowTable = () => {
    setHistoryView('table');
    setHistoryControlsError('');
  };

  if (!site) {
    return (
      <div className="site-detail empty-state">
        <h2>{t('Select a site')}</h2>
        <p>{t('Choose a site from the list to begin capturing data.')}</p>
      </div>
    );
  }

  const openCreateModal = (type) => {
    if (!canManageFeatures) {
      return;
    }
    setCreateModal(type);
    setCreateError('');
    if (type === 'well') {
      setCreateForm({ name: '', location: '' });
    } else if (type === 'tank') {
      setCreateForm({ name: '', capacity: '' });
    } else if (type === 'flowmeter') {
      setCreateForm({ name: '', location: '' });
    }
  };

  const openRecordModal = (type, feature) => {
    if (!canRecordMeasurements) {
      return;
    }
    setRecordModal({ type, feature });
    setRecordError('');
    if (type === 'well') {
      setRecordForm({ depth: '', comment: '', recordedAt: defaultTimestamp() });
    } else if (type === 'tank') {
      setRecordForm({ level: '', comment: '', recordedAt: defaultTimestamp() });
    } else if (type === 'flowmeter') {
      setRecordForm({
        instantaneousFlow: '',
        totalizedVolume: '',
        comment: '',
        recordedAt: defaultTimestamp()
      });
    }
  };

  const closeCreateModal = () => {
    if (createSubmitting) {
      return;
    }
    setCreateModal(null);
    setCreateError('');
    setCreateForm({});
  };

  const closeRecordModal = () => {
    if (recordSubmitting) {
      return;
    }
    setRecordModal(null);
    setRecordError('');
    setRecordForm({});
  };

  const handleCreateChange = (field) => (event) => {
    setCreateForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRecordChange = (field) => (event) => {
    setRecordForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (!createModal) {
      return;
    }

    if (!canManageFeatures) {
      setCreateError(t('You do not have permission to add new features.'));
      return;
    }

    if (createModal === 'well') {
      if (!createForm.name?.trim()) {
        setCreateError(t('Well name is required.'));
        return;
      }
      try {
        setCreateSubmitting(true);
        await onAddWell(site.id, {
          name: createForm.name.trim(),
          location: createForm.location?.trim() || undefined
        });
        setCreateModal(null);
        setCreateError('');
        setCreateForm({});
        return;
      } catch (error) {
        setCreateError(error.message || t('Unable to save well.'));
      } finally {
        setCreateSubmitting(false);
      }
    }

    if (createModal === 'tank') {
      const capacityValue = Number(createForm.capacity);
      if (!createForm.name?.trim() || Number.isNaN(capacityValue)) {
        setCreateError(t('Tank name and capacity are required.'));
        return;
      }

      try {
        setCreateSubmitting(true);
        await onAddTank(site.id, {
          name: createForm.name.trim(),
          capacity: capacityValue
        });
        setCreateModal(null);
        setCreateError('');
        setCreateForm({});
        return;
      } catch (error) {
        setCreateError(error.message || t('Unable to save tank.'));
      } finally {
        setCreateSubmitting(false);
      }
    }

    if (createModal === 'flowmeter') {
      if (!createForm.name?.trim()) {
        setCreateError(t('Flowmeter name is required.'));
        return;
      }

      try {
        setCreateSubmitting(true);
        await onAddFlowmeter(site.id, {
          name: createForm.name.trim(),
          location: createForm.location?.trim() || undefined
        });
        setCreateModal(null);
        setCreateError('');
        setCreateForm({});
        return;
      } catch (error) {
        setCreateError(error.message || t('Unable to save flowmeter.'));
      } finally {
        setCreateSubmitting(false);
      }
    }
  };

  const handleRecordSubmit = async (event) => {
    event.preventDefault();
    if (!recordModal) {
      return;
    }

    if (!canRecordMeasurements) {
      setRecordError(t('You do not have permission to record entries.'));
      return;
    }

    if (!userName) {
      setRecordError(t('Your user name is required to record entries.'));
      return;
    }

    const { type, feature } = recordModal;

    if (type === 'well') {
      if (!recordForm.depth) {
        setRecordError(t('Depth is required.'));
        return;
      }

      try {
        setRecordSubmitting(true);
        await onRecordWell(feature.id, {
          depth: Number(recordForm.depth),
          comment: recordForm.comment?.trim() || undefined,
          recordedAt: recordForm.recordedAt ? new Date(recordForm.recordedAt).toISOString() : undefined,
          operator: userName
        });
        setRecordModal(null);
        setRecordError('');
        setRecordForm({});
        return;
      } catch (error) {
        setRecordError(error.message || t('Unable to save measurement.'));
      } finally {
        setRecordSubmitting(false);
      }
    }

    if (type === 'tank') {
      if (!recordForm.level) {
        setRecordError(t('Level is required.'));
        return;
      }

      try {
        setRecordSubmitting(true);
        await onRecordTank(feature.id, {
          level: Number(recordForm.level),
          comment: recordForm.comment?.trim() || undefined,
          recordedAt: recordForm.recordedAt ? new Date(recordForm.recordedAt).toISOString() : undefined,
          operator: userName
        });
        setRecordModal(null);
        setRecordError('');
        setRecordForm({});
        return;
      } catch (error) {
        setRecordError(error.message || t('Unable to save reading.'));
      } finally {
        setRecordSubmitting(false);
      }
    }

    if (type === 'flowmeter') {
      if (!recordForm.instantaneousFlow || !recordForm.totalizedVolume) {
        setRecordError(t('Both flow values are required.'));
        return;
      }

      try {
        setRecordSubmitting(true);
        await onRecordFlowmeter(feature.id, {
          instantaneousFlow: Number(recordForm.instantaneousFlow),
          totalizedVolume: Number(recordForm.totalizedVolume),
          comment: recordForm.comment?.trim() || undefined,
          recordedAt: recordForm.recordedAt ? new Date(recordForm.recordedAt).toISOString() : undefined,
          operator: userName
        });
        setRecordModal(null);
        setRecordError('');
        setRecordForm({});
        return;
      } catch (error) {
        setRecordError(error.message || t('Unable to save reading.'));
      } finally {
        setRecordSubmitting(false);
      }
    }
  };

  return (
    <div className="site-detail">
      <header className="site-header">
        <div>
          <h1>{site.name}</h1>
          {site.location && <p className="meta">{site.location}</p>}
        </div>
        <div className="operator-chip">
          <span>
            {t('Logged in as {name}', { name: displayUserName })}
          </span>
          <span className="operator-role">{t('Role: {role}', { role: userRoleLabel })}</span>
        </div>
      </header>

      <section className="site-actions">
        <h2>{t('Quick actions')}</h2>
        {canManageFeatures ? (
          <>
            <p className="actions-help">{t('Add new assets directly from here.')}</p>
            <div className="site-actions-buttons">
              <button type="button" onClick={() => openCreateModal('well')}>
                {t('Add well')}
              </button>
              <button type="button" onClick={() => openCreateModal('tank')}>
                {t('Add tank')}
              </button>
              <button type="button" onClick={() => openCreateModal('flowmeter')}>
                {t('Add flowmeter')}
              </button>
            </div>
          </>
        ) : (
          <p className="actions-help">{t('You do not have permission to add new assets.')}</p>
        )}
      </section>

      <section className="feature-summary">
        <h2>{t('Feature summary')}</h2>
        {features.length > 0 && (
          <div className="feature-filters" role="group" aria-label={t('Filter feature cards by type')}>
            {Object.entries(filterLabels).map(([type, label]) => {
              const active = visibleTypes[type];
              return (
                <button
                  key={type}
                  type="button"
                  className={`filter-button${active ? ' active' : ''}`}
                  onClick={() => toggleType(type)}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {features.length === 0 ? (
          <p className="empty">{t('No features recorded for this site yet.')}</p>
        ) : filteredFeatures.length === 0 ? (
          <p className="empty">{t('No features match the selected filters.')}</p>
        ) : (
          <div className="asset-grid">
            {filteredFeatures.map((feature) => {
              if (feature.type === 'well') {
                return (
                  <WellCard
                    key={`well-${feature.data.id}`}
                    well={feature.data}
                    onViewHistory={(well) => openHistoryModal('well', well)}
                    onAddMeasurement={
                      canRecordMeasurements ? (well) => openRecordModal('well', well) : undefined
                    }
                  />
                );
              }
              if (feature.type === 'tank') {
                return (
                  <TankCard
                    key={`tank-${feature.data.id}`}
                    tank={feature.data}
                    onViewHistory={(tank) => openHistoryModal('tank', tank)}
                    onAddReading={
                      canRecordMeasurements ? (tank) => openRecordModal('tank', tank) : undefined
                    }
                  />
                );
              }
              return (
                <FlowmeterCard
                  key={`flowmeter-${feature.data.id}`}
                  flowmeter={feature.data}
                  onViewHistory={(flowmeter) => openHistoryModal('flowmeter', flowmeter)}
                  onAddReading={
                    canRecordMeasurements
                      ? (flowmeter) => openRecordModal('flowmeter', flowmeter)
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      {historyModal && (
        <div className="history-fullscreen" role="dialog" aria-modal="true">
          <div className="history-fullscreen-header">
            <div>
              <h2>{`${typeLabels[historyModal.type]} ${historyTypeLabels[historyModal.type]}`}</h2>
              <p className="history-fullscreen-subtitle">{historyModal.feature.name}</p>
            </div>
            <div className="history-fullscreen-actions">
              {historyView === 'chart' ? (
                <button type="button" className="secondary" onClick={handleShowTable}>
                  {t('View table')}
                </button>
              ) : (
                <button type="button" className="secondary" onClick={handleShowChart}>
                  {t('View chart')}
                </button>
              )}
              <button type="button" className="history-close-button" onClick={closeHistoryModal}>
                {t('Close')}
              </button>
            </div>
          </div>
          <div className="history-fullscreen-body">
            {historyView === 'chart' ? (
              <div className="history-chart-view">
                <form className="history-chart-controls" onSubmit={handleChartSubmit}>
                  <label>
                    {t('From')}
                    <input
                      type="datetime-local"
                      value={chartForm.from}
                      onChange={handleChartFormChange('from')}
                    />
                  </label>
                  <label>
                    {t('To')}
                    <input
                      type="datetime-local"
                      value={chartForm.to}
                      onChange={handleChartFormChange('to')}
                    />
                  </label>
                  <div className="history-chart-buttons">
                    <button type="submit" disabled={chartState.loading}>
                      {chartState.loading ? t('Loading data…') : t('Apply')}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleChartReset}
                      disabled={chartState.loading}
                    >
                      {t('Reset')}
                    </button>
                  </div>
                </form>
                {chartState.error ? (
                  <p className="form-error">{chartState.error}</p>
                ) : chartState.loading && chartState.items.length === 0 ? (
                  <p className="history-status">{t('Loading data…')}</p>
                ) : (
                  <HistoryChart
                data={chartState.items}
                series={chartSeriesConfig[historyModal.type] || []}
              />
            )}
          </div>
        ) : (
          <div className="history-table-view">
            <div className="history-operator-filter">
              <div className="history-operator-label">{t('Filter by operator')}</div>
              <div className="history-operator-buttons">
                <button
                  type="button"
                  className={`history-operator-button${historyFilters.operator ? '' : ' active'}`}
                  onClick={() => handleHistoryOperatorSelect('')}
                  disabled={historyState.loading}
                >
                  {t('All operators')}
                </button>
                {historyOperators.map((operator) => (
                  <button
                    key={operator}
                    type="button"
                    className={`history-operator-button${historyFilters.operator === operator ? ' active' : ''}`}
                    onClick={() => handleHistoryOperatorSelect(operator)}
                    disabled={historyState.loading}
                  >
                    {operator}
                  </button>
                ))}
              </div>
            </div>

            {historyState.loading ? (
              <p className="history-status">{t('Loading data…')}</p>
            ) : historyState.error ? (
              <p className="form-error">{historyState.error}</p>
            ) : historyState.items.length === 0 ? (
              <p className="history-empty">{t('No history entries', { label: historySummaryLabel })}</p>
            ) : (
              <>
                <div className="history-table-controls">
                  <form className="history-table-filter" onSubmit={handleHistoryFilterSubmit}>
                    <label>
                      {t('From')}
                      <input
                        type="datetime-local"
                        value={historyFilterForm.from}
                        onChange={handleHistoryFilterFormChange('from')}
                        disabled={historyState.loading}
                      />
                    </label>
                    <label>
                      {t('To')}
                      <input
                        type="datetime-local"
                        value={historyFilterForm.to}
                        onChange={handleHistoryFilterFormChange('to')}
                        disabled={historyState.loading}
                      />
                    </label>
                    <div className="history-table-buttons">
                      <button type="submit" disabled={historyState.loading}>
                        {historyState.loading ? t('Loading data…') : t('Apply')}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={handleHistoryFilterReset}
                        disabled={historyState.loading}
                      >
                        {t('Reset')}
                      </button>
                    </div>
                  </form>
                  <button
                    type="button"
                    className="history-download-button secondary"
                    onClick={handleDownloadCsv}
                    disabled={historyDownloading || historyState.loading || historyState.items.length === 0}
                  >
                    {historyDownloading ? 'Downloading…' : t('Download')}
                  </button>
                </div>
                {historyControlsError && (
                  <p className="form-error history-controls-error">{historyControlsError}</p>
                )}
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        {historyColumns[historyModal.type].map((column) => (
                          <th key={column.key}>{column.label}</th>
                        ))}
                        <th className="history-actions-column">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyState.items.map((item) => (
                        <tr key={item.id}>
                          {historyColumns[historyModal.type].map((column) => (
                            <td key={column.key}>{column.render(item)}</td>
                          ))}
                          <td className="history-actions-column">
                            {canDeleteHistoryItem(item) ? (
                              <button
                                type="button"
                                className="history-delete-button"
                                onClick={() => handleHistoryDelete(item)}
                                disabled={historyDeletingId === item.id || historyState.loading}
                              >
                                {historyDeletingId === item.id ? 'Deleting…' : 'Delete'}
                              </button>
                            ) : (
                              <span className="history-no-actions">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="history-pagination">
                  <span>
                    {t('Showing range', {
                      start: historyRangeStart,
                      end: historyRangeEnd,
                      total: historyState.total
                    })}
                  </span>
                  <div className="history-pagination-buttons">
                    <button
                      type="button"
                      onClick={handleHistoryPrevious}
                      disabled={!historyHasPrevious || historyState.loading}
                      className="secondary"
                    >
                      {t('Previous')}
                    </button>
                    <button
                      type="button"
                      onClick={handleHistoryNext}
                      disabled={!historyHasNext || historyState.loading}
                    >
                      {t('Next')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )}

      {createModal && (
        <Modal
          title={t('Add new {type}', { type: typeLabels[createModal] })}
          onClose={closeCreateModal}
          dismissDisabled={createSubmitting}
          actions={
            <>
              <button
                type="button"
                className="secondary"
                onClick={closeCreateModal}
                disabled={createSubmitting}
              >
                {t('Cancel')}
              </button>
              <button type="submit" form="create-feature-form" disabled={createSubmitting}>
                {createSubmitting ? 'Saving…' : t('Save')}
              </button>
            </>
          }
        >
          <form id="create-feature-form" className="modal-form" onSubmit={handleCreateSubmit}>
            <label>
              {t('Name')}
              <input
                type="text"
                value={createForm.name}
                onChange={handleCreateChange('name')}
                required
              />
            </label>
            {createModal === 'tank' && (
              <label>
                {t('Capacity (L)')}
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={createForm.capacity}
                  onChange={handleCreateChange('capacity')}
                  required
                />
              </label>
            )}
            {createModal !== 'tank' && (
              <label>
                {t('Location')}
                <input
                  type="text"
                  value={createForm.location}
                  onChange={handleCreateChange('location')}
                />
              </label>
            )}
            {createError && <p className="form-error">{createError}</p>}
          </form>
        </Modal>
      )}

      {recordModal && (
        <Modal
          title={
            recordModal.type === 'well'
              ? t('Add new measurement')
              : t('Add new reading')
          }
          onClose={closeRecordModal}
          dismissDisabled={recordSubmitting}
          actions={
            <>
              <button
                type="button"
                className="secondary"
                onClick={closeRecordModal}
                disabled={recordSubmitting}
              >
                {t('Cancel')}
              </button>
              <button type="submit" form="record-feature-form" disabled={recordSubmitting}>
                {recordSubmitting ? 'Saving…' : t('Save')}
              </button>
            </>
          }
        >
          <form id="record-feature-form" className="modal-form" onSubmit={handleRecordSubmit}>
              {recordModal.type === 'well' && (
                <label>
                  {t('Depth (m)')}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recordForm.depth}
                    onChange={handleRecordChange('depth')}
                    required
                  />
                </label>
              )}
            {recordModal.type === 'tank' && (
              <label>
                {t('Level (L)')}
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={recordForm.level}
                  onChange={handleRecordChange('level')}
                  required
                />
              </label>
            )}
            {recordModal.type === 'flowmeter' && (
              <>
                <label>
                  {t('Instantaneous flow (L/min)')}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recordForm.instantaneousFlow}
                    onChange={handleRecordChange('instantaneousFlow')}
                    required
                  />
                </label>
                <label>
                  {t('Totalized volume (L)')}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recordForm.totalizedVolume}
                    onChange={handleRecordChange('totalizedVolume')}
                    required
                  />
                </label>
              </>
            )}
            <label>
              {t('Recorded at label')}
              <input
                type="datetime-local"
                value={recordForm.recordedAt}
                onChange={handleRecordChange('recordedAt')}
              />
            </label>
            <label>
              {t('Comment (optional)')}
              <textarea
                rows="2"
                value={recordForm.comment}
                onChange={handleRecordChange('comment')}
                placeholder={t('Comment (optional)')}
              />
            </label>
            <p className="operator-reminder">
              {t('Logged in as {name}', { name: displayUserName })} ({userRoleLabel})
            </p>
            {recordError && <p className="form-error">{recordError}</p>}
          </form>
        </Modal>
      )}
    </div>
  );
}
