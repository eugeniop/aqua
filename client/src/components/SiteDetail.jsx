import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';
import TankCard from './TankCard.jsx';
import FlowmeterCard from './FlowmeterCard.jsx';
import WellCard from './WellCard.jsx';
import Modal from './Modal.jsx';
import HistoryChart from './HistoryChart.jsx';
import TimeZoneSelect from './TimeZoneSelect.jsx';
import {
  getTankReadings,
  getFlowmeterReadings,
  getWellMeasurements,
  deleteTankReading,
  deleteFlowmeterReading,
  deleteWellMeasurement,
  getOperators
} from '../api.js';
import './SiteDetail.css';

const createDateFormatter = (timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

const createDateTimeFormatter = (timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

const createOffsetFormatter = (timeZone) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

const partsToObject = (parts) =>
  parts.reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

const formatDateInput = (value, timeZone) => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const parts = partsToObject(createDateFormatter(timeZone).formatToParts(date));
  const { year, month, day } = parts;
  return `${year}-${month}-${day}`;
};

const formatDateTimeInput = (value, timeZone) => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const parts = partsToObject(createDateTimeFormatter(timeZone).formatToParts(date));
  const { year, month, day, hour, minute } = parts;
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const getTimeZoneOffsetMinutes = (date, timeZone) => {
  const parts = partsToObject(createOffsetFormatter(timeZone).formatToParts(date));
  const { year, month, day, hour, minute, second } = parts;
  const asUTC = Date.UTC(year, Number(month) - 1, day, hour, minute, second);
  return (asUTC - date.getTime()) / 60000;
};

const parseDateTimeInTimeZone = (value, timeZone) => {
  if (!value) {
    return null;
  }
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) {
    return null;
  }
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if ([year, month, day, hour, minute].some((number) => Number.isNaN(number))) {
    return null;
  }
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (Number.isNaN(utcDate.getTime())) {
    return null;
  }
  const offset = getTimeZoneOffsetMinutes(utcDate, timeZone);
  return new Date(utcDate.getTime() - offset * 60000);
};

const parseCsvText = (content) => {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '"') {
      const nextChar = content[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(current);
      current = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && content[index + 1] === '\n') {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => (cell || '').trim() !== ''));
};

const formatUtcDate = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = String(date.getUTCFullYear());
  return `${month}-${day}-${year}`;
};

const formatUtcTime = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hour}:${minute}:${second}`;
};

const BULK_ROW_COUNT = 20;
const defaultPumpState = 'off';

const applyBulkChronologyErrors = (rows, errors, parseDate) => {
  const nextErrors = Object.entries(errors).reduce((acc, [rowIndex, rowErrors]) => {
    const { order, ...rest } = rowErrors;
    if (Object.keys(rest).length > 0) {
      acc[rowIndex] = rest;
    }
    return acc;
  }, {});

  let lastRecordedAt = null;
  rows.forEach((row, index) => {
    const currentRecordedAt = parseDate(row);
    if (currentRecordedAt && lastRecordedAt && currentRecordedAt.getTime() < lastRecordedAt.getTime()) {
      nextErrors[index] = { ...(nextErrors[index] || {}), order: true };
      return;
    }

    if (currentRecordedAt) {
      lastRecordedAt = currentRecordedAt;
    }
  });

  return nextErrors;
};

const TABLE_PAGE_SIZE = Number.parseInt(import.meta.env.VITE_TABLE_PAGE_SIZE, 10);
const HISTORY_PAGE_SIZE = Number.isNaN(TABLE_PAGE_SIZE) || TABLE_PAGE_SIZE <= 0 ? 20 : TABLE_PAGE_SIZE;

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

const WELL_SERIES_COLORS = [
  '#1d4ed8',
  '#0f766e',
  '#ca8a04',
  '#dc2626',
  '#7c3aed',
  '#0ea5e9',
  '#9333ea',
  '#059669',
  '#f97316',
  '#3b82f6'
];

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
  onRecordWell,
  onRecordWellBulk
}) {
  const { t, formatDateTime, timeZone } = useTranslation();
  const [bulkTimeZone, setBulkTimeZone] = useState(timeZone);
  const defaultTimestamp = () => formatDateTimeInput(new Date(), timeZone);
  const defaultDateOnly = (zone = timeZone) => formatDateInput(new Date(), zone);
  const emptyBulkRow = (pumpState = defaultPumpState, zone = bulkTimeZone) => ({
    date: defaultDateOnly(zone),
    time: '',
    depthToWater: '',
    pumpState,
    pumpStateAssumed: false,
    comment: ''
  });
  const createBulkRows = (zone = bulkTimeZone) =>
    Array.from({ length: BULK_ROW_COUNT }, () => emptyBulkRow(defaultPumpState, zone));
  const parseBulkRowDateTime = (row) =>
    row.date && (row.time || '').trim()
      ? parseDateTimeInTimeZone(`${row.date}T${row.time}`, bulkTimeZone || timeZone)
      : null;
  const roundDepthToWater = (value) => {
    if (value == null || value === '') {
      return '';
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return value;
    }
    return parsed.toFixed(2);
  };
  const toRecordedAtIso = (value) => {
    if (!value) {
      return undefined;
    }
    const parsed = parseDateTimeInTimeZone(value, timeZone);
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed.toISOString();
  };
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
          key: 'recordedAt',
          label: t('Recorded at'),
          render: (item) => formatDateTime(item.recordedAt)
        },
        {
          key: 'depthToWater',
          label: t('Depth to water (m)'),
          render: (item) =>
            item.depthToWater == null ? '—' : Number(item.depthToWater).toFixed(2)
        },
        {
          key: 'pumpState',
          label: t('Pump state'),
          render: (item) => {
            if (!item.pumpState) {
              return '—';
            }
            return item.pumpState === 'on' ? t('On') : t('Off');
          }
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
      well: [
        {
          key: 'depthToWater',
          label: t('Depth to water (m)'),
          color: '#1e40af',
          getPointColor: (point) => (point.pumpState === 'on' ? '#7dd3fc' : '#1e40af')
        }
      ],
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
  const displayUserName = userName || 'Unknown operator';
  const canSelectBulkOperator = userRole === 'admin' || userRole === 'superadmin';
  const defaultOperatorFilter = () => '';

  const [createModal, setCreateModal] = useState(null);
  const [createForm, setCreateForm] = useState({});
  const [createError, setCreateError] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [recordModal, setRecordModal] = useState(null);
  const [recordForm, setRecordForm] = useState({});
  const [recordError, setRecordError] = useState('');
  const [recordSubmitting, setRecordSubmitting] = useState(false);

  const [bulkWellModal, setBulkWellModal] = useState(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkErrors, setBulkErrors] = useState({});
  const [bulkError, setBulkError] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkConfirmPending, setBulkConfirmPending] = useState(null);
  const [bulkUnsavedConfirm, setBulkUnsavedConfirm] = useState(false);
  const [bulkOperator, setBulkOperator] = useState('');
  const [bulkOperatorOptions, setBulkOperatorOptions] = useState([]);
  const [bulkOperatorLoading, setBulkOperatorLoading] = useState(false);
  const [bulkOperatorError, setBulkOperatorError] = useState('');
  const [bulkImportNotice, setBulkImportNotice] = useState('');

  const [wellAnalysisOpen, setWellAnalysisOpen] = useState(false);
  const [wellAnalysisForm, setWellAnalysisForm] = useState({ from: '', to: '' });
  const [wellAnalysisState, setWellAnalysisState] = useState({ loading: false, error: '', items: [] });
  const [wellAnalysisVisibility, setWellAnalysisVisibility] = useState({});

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
    if (userRole === 'admin' || userRole === 'superadmin') {
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
    setBulkWellModal(null);
    setBulkRows([]);
    setBulkErrors({});
    setBulkError('');
    setBulkSubmitting(false);
    setBulkConfirmPending(null);
    setBulkUnsavedConfirm(false);
    setBulkOperator('');
    setBulkOperatorOptions([]);
    setBulkOperatorLoading(false);
    setBulkOperatorError('');
    setBulkImportNotice('');
    setBulkTimeZone(timeZone);
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
    setWellAnalysisOpen(false);
    setWellAnalysisForm({ from: '', to: '' });
    setWellAnalysisState({ loading: false, error: '', items: [] });
    setWellAnalysisVisibility({});
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

  const wellSeries = useMemo(() => {
    if (!site?.wells?.length) {
      return [];
    }
    return site.wells.map((well, index) => ({
      key: `well-${well.id}`,
      label: well.name,
      color: WELL_SERIES_COLORS[index % WELL_SERIES_COLORS.length]
    }));
  }, [site]);

  const visibleWellSeries = useMemo(
    () => wellSeries.filter((serie) => wellAnalysisVisibility[serie.key] !== false),
    [wellAnalysisVisibility, wellSeries]
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
          const fromDate = parseDateTimeInTimeZone(historyFilters.from, timeZone);
          if (fromDate && !Number.isNaN(fromDate.getTime())) {
            params.from = fromDate.toISOString();
          }
        }
        if (historyFilters.to) {
          const toDate = parseDateTimeInTimeZone(historyFilters.to, timeZone);
          if (toDate && !Number.isNaN(toDate.getTime())) {
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
  }, [historyModal, historyPage, historyReloadToken, historyFilters, timeZone]);

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

  useEffect(() => {
    if (!historyModal) {
      return undefined;
    }

    const handlePopState = () => {
      closeHistoryModal();
    };

    const currentState = window.history.state || {};
    window.history.pushState({ ...currentState, historyModal: true }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [historyModal]);

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

  const bulkOperatorOptionsList = useMemo(() => {
    const options = new Set();
    (bulkOperatorOptions || []).forEach((operator) => {
      if (operator?.name) {
        options.add(operator.name);
      }
    });
    if (userName) {
      options.add(userName);
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [bulkOperatorOptions, userName]);

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
      const fromDate = parseDateTimeInTimeZone(from, timeZone);
      const toDate = parseDateTimeInTimeZone(to, timeZone);
      if (fromDate && toDate && fromDate > toDate) {
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
        const fromDate = parseDateTimeInTimeZone(historyFilters.from, timeZone);
        if (fromDate && !Number.isNaN(fromDate.getTime())) {
          params.from = fromDate.toISOString();
        }
      }
      if (historyFilters.to) {
        const toDate = parseDateTimeInTimeZone(historyFilters.to, timeZone);
        if (toDate && !Number.isNaN(toDate.getTime())) {
          params.to = toDate.toISOString();
        }
      }

      const result = await fetchHistory(historyModal.feature.id, params);
      const items = result.items ?? [];

      if (items.length === 0) {
        setHistoryControlsError(t('No rows available for the selected filters.'));
        return;
      }

      const wellCsvColumns = [
        {
          key: 'recordedAtDate',
          label: t('Date'),
          render: (item) => formatUtcDate(item.recordedAt)
        },
        {
          key: 'recordedAtTime',
          label: t('Time'),
          render: (item) => formatUtcTime(item.recordedAt)
        },
        {
          key: 'depthToWater',
          label: t('Depth to water'),
          render: (item) =>
            item.depthToWater == null ? '—' : Number(item.depthToWater).toFixed(2)
        },
        {
          key: 'pumpState',
          label: t('Pump state'),
          render: (item) => {
            if (!item.pumpState) {
              return '—';
            }
            return item.pumpState === 'on' ? t('On') : t('Off');
          }
        },
        { key: 'operator', label: t('Operator'), render: (item) => item.operator || '—' },
        {
          key: 'comment',
          label: t('Comments'),
          render: (item) => (item.comment ? item.comment : '—')
        }
      ];

      const columns = historyModal.type === 'well' ? wellCsvColumns : historyColumns[historyModal.type] ?? [];
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
      const fromDate = parseDateTimeInTimeZone(fromValue, timeZone);
      const toDate = parseDateTimeInTimeZone(toValue, timeZone);
      if (fromDate && toDate && fromDate > toDate) {
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
        const fromDate = parseDateTimeInTimeZone(fromValue, timeZone);
        if (fromDate && !Number.isNaN(fromDate.getTime())) {
          params.from = fromDate.toISOString();
        }
      }
      if (toValue) {
        const toDate = parseDateTimeInTimeZone(toValue, timeZone);
        if (toDate && !Number.isNaN(toDate.getTime())) {
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

  const handleChartPointSelect = (point) => {
    const formatted = formatDateTimeInput(point.recordedAt || point.time, timeZone);
    if (!formatted) {
      return;
    }
    const selectedDate = parseDateTimeInTimeZone(formatted, timeZone);
    setChartForm((prev) => {
      if (!prev.from || (prev.from && prev.to)) {
        return { ...prev, from: formatted, to: '' };
      }
      const fromDate = parseDateTimeInTimeZone(prev.from, timeZone);
      if (
        selectedDate &&
        fromDate &&
        !Number.isNaN(selectedDate.getTime()) &&
        !Number.isNaN(fromDate.getTime()) &&
        selectedDate < fromDate
      ) {
        return { ...prev, from: formatted, to: prev.from };
      }
      return { ...prev, to: formatted };
    });
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

  const openWellAnalysis = () => {
    if (!site?.wells?.length) {
      return;
    }
    const visibility = site.wells.reduce((acc, well) => {
      acc[`well-${well.id}`] = true;
      return acc;
    }, {});
    setWellAnalysisVisibility(visibility);
    setWellAnalysisForm({ from: '', to: '' });
    setWellAnalysisState({ loading: false, error: '', items: [] });
    setWellAnalysisOpen(true);
  };

  const closeWellAnalysis = () => {
    setWellAnalysisOpen(false);
    setWellAnalysisForm({ from: '', to: '' });
    setWellAnalysisState({ loading: false, error: '', items: [] });
    setWellAnalysisVisibility({});
  };

  const handleWellAnalysisFormChange = (field) => (event) => {
    const { value } = event.target;
    setWellAnalysisForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleWellSeriesVisibility = (seriesKey) => {
    setWellAnalysisVisibility((prev) => ({ ...prev, [seriesKey]: !prev[seriesKey] }));
  };

  const loadWellAnalysisData = async (overrides = {}) => {
    if (!site?.wells?.length) {
      return;
    }
    const fromValue = overrides.from ?? wellAnalysisForm.from;
    const toValue = overrides.to ?? wellAnalysisForm.to;
    setWellAnalysisState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const params = { page: 1, limit: 500, order: 'asc' };
      if (fromValue) {
        const fromDate = parseDateTimeInTimeZone(fromValue, timeZone);
        if (fromDate && !Number.isNaN(fromDate.getTime())) {
          params.from = fromDate.toISOString();
        }
      }
      if (toValue) {
        const toDate = parseDateTimeInTimeZone(toValue, timeZone);
        if (toDate && !Number.isNaN(toDate.getTime())) {
          params.to = toDate.toISOString();
        }
      }

      const results = await Promise.all(
        site.wells.map(async (well) => {
          const result = await getWellMeasurements(well.id, params);
          return { well, items: result.items ?? [] };
        })
      );

      const combinedItems = results.flatMap(({ well, items }) =>
        items.map((item) => ({
          recordedAt: item.recordedAt,
          pumpState: item.pumpState,
          [`well-${well.id}`]: item.depthToWater
        }))
      );

      setWellAnalysisState({ loading: false, error: '', items: combinedItems });
    } catch (error) {
      setWellAnalysisState({
        loading: false,
        error: error.message || t('Unable to load well analysis data'),
        items: []
      });
    }
  };

  const handleWellAnalysisSubmit = async (event) => {
    event.preventDefault();
    await loadWellAnalysisData();
  };

  const handleWellAnalysisReset = async () => {
    setWellAnalysisForm({ from: '', to: '' });
    await loadWellAnalysisData({ from: '', to: '' });
  };

  useEffect(() => {
    if (!wellAnalysisOpen) {
      return;
    }
    loadWellAnalysisData();
  }, [wellAnalysisOpen]);

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
      setRecordForm({
        depthToWater: '',
        pumpState: defaultPumpState,
        comment: '',
        recordedAt: defaultTimestamp()
      });
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

  const clearBulkErrorField = (errors, rowIndex, targetField) => {
    if (!errors[rowIndex]) {
      return errors;
    }

    const rowErrors = { ...errors[rowIndex] };
    delete rowErrors[targetField];

    if (Object.keys(rowErrors).length === 0) {
      const { [rowIndex]: removed, ...rest } = errors; // eslint-disable-line no-unused-vars
      return rest;
    }

    return { ...errors, [rowIndex]: rowErrors };
  };

  const isBulkRowPristine = (row) =>
    (row.depthToWater === '' || row.depthToWater == null) &&
    !(row.time || '').trim() &&
    !(row.comment || '').trim();

  const csvHeaderAliases = {
    date: ['date'],
    time: ['time'],
    depth: [
      'depth to water (in meters)',
      'depth to water (meters)',
      'depth to water (metres)',
      'depth to water (m)',
      'depth to water',
      'depth (m)',
      'depth'
    ],
    comment: ['comments', 'comment', 'notes', 'note', 'remarks', 'remark']
  };

  const normalizeCsvHeader = (value) => (value || '').trim().toLowerCase();

  const normalizeCsvDate = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const monthDayYear = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (monthDayYear) {
      const [, month, day, year] = monthDayYear;
      const normalizedYear = year.length === 2 ? `20${year}` : year;
      return `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const yearFirst = trimmed.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (yearFirst) {
      const [, year, month, day] = yearFirst;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateInput(parsed, bulkTimeZone || timeZone);
    }

    return '';
  };

  const normalizeCsvTime = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return '';
    }

    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/i);
    if (ampmMatch) {
      let hour = Number(ampmMatch[1]);
      const minute = ampmMatch[2];
      const period = ampmMatch[3].toLowerCase();
      if (period === 'pm' && hour < 12) {
        hour += 12;
      }
      if (period === 'am' && hour === 12) {
        hour = 0;
      }
      return `${String(hour).padStart(2, '0')}:${minute}`;
    }

    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (timeMatch) {
      return `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
    }

    return '';
  };

  const inferPumpStateFromComment = (comment) => {
    const trimmed = (comment || '').trim();
    if (!trimmed) {
      return null;
    }
    if (/^pump on$/i.test(trimmed)) {
      return 'on';
    }
    if (/^pump off$/i.test(trimmed)) {
      return 'off';
    }
    return null;
  };

  const parseBulkCsvRows = (content) => {
    const rows = parseCsvText(content);
    if (rows.length === 0) {
      return { dataRows: [], hasHeader: false };
    }

    const headerValues = rows[0].map(normalizeCsvHeader);
    const headerMap = {};

    headerValues.forEach((header, index) => {
      if (csvHeaderAliases.date.includes(header)) {
        headerMap.date = index;
      }
      if (csvHeaderAliases.time.includes(header)) {
        headerMap.time = index;
      }
      if (csvHeaderAliases.depth.includes(header)) {
        headerMap.depth = index;
      }
      if (csvHeaderAliases.comment.includes(header)) {
        headerMap.comment = index;
      }
    });

    const hasHeader =
      headerMap.date != null ||
      headerMap.time != null ||
      headerMap.depth != null ||
      headerMap.comment != null;

    const dataRows = hasHeader ? rows.slice(1) : rows;
    const defaultColumnMap = { date: 0, time: 1, depth: 2, comment: 3 };
    const columnMap = hasHeader ? { ...headerMap } : defaultColumnMap;

    if (hasHeader) {
      const usedIndices = new Set(Object.values(columnMap).filter((value) => value != null));
      Object.entries(defaultColumnMap).forEach(([key, index]) => {
        if (columnMap[key] == null && !usedIndices.has(index)) {
          columnMap[key] = index;
          usedIndices.add(index);
        }
      });
    }

    return {
      hasHeader,
      dataRows: dataRows.map((row) => ({
        date: normalizeCsvDate(row[columnMap.date]),
        time: normalizeCsvTime(row[columnMap.time]),
        depthToWater: (row[columnMap.depth] || '').trim(),
        comment: (row[columnMap.comment] || '').trim()
      }))
    };
  };

  const getPreviousPumpState = (rows, index) => {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const pumpState = rows[cursor]?.pumpState;
      if (pumpState) {
        return pumpState;
      }
    }
    return defaultPumpState;
  };

  const isBulkRowEmpty = (row) => row.depthToWater === '' || row.depthToWater == null;

  const openBulkWellModal = (well) => {
    if (!canRecordMeasurements) {
      return;
    }
    const zone = timeZone;
    setBulkWellModal(well);
    setBulkRows(createBulkRows(zone));
    setBulkErrors({});
    setBulkError('');
    setBulkConfirmPending(null);
    setBulkUnsavedConfirm(false);
    setBulkOperator(userName);
    setBulkTimeZone(zone);
    setBulkImportNotice('');
    setBulkOperatorError('');
  };

  useEffect(() => {
    if (!bulkWellModal) {
      return;
    }

    let cancelled = false;

    const loadOperators = async () => {
      setBulkOperatorLoading(true);
      setBulkOperatorError('');
      try {
        const result = await getOperators();
        if (cancelled) {
          return;
        }
        setBulkOperatorOptions(result || []);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setBulkOperatorError(error.message || t('Unable to load operators.'));
      } finally {
        if (!cancelled) {
          setBulkOperatorLoading(false);
        }
      }
    };

    loadOperators();

    return () => {
      cancelled = true;
    };
  }, [bulkWellModal, t]);

  useEffect(() => {
    if (!bulkWellModal) {
      return;
    }
    setBulkErrors((prevErrors) =>
      applyBulkChronologyErrors(bulkRows, prevErrors, parseBulkRowDateTime)
    );
  }, [bulkTimeZone, bulkWellModal]);

  useEffect(() => {
    if (!bulkWellModal) {
      return;
    }
    if (!bulkOperator && bulkOperatorOptionsList.length > 0) {
      setBulkOperator(bulkOperatorOptionsList[0]);
    }
  }, [bulkOperator, bulkOperatorOptionsList, bulkWellModal]);

  const closeBulkWellModal = () => {
    if (bulkSubmitting) {
      return;
    }
    setBulkWellModal(null);
    setBulkRows([]);
    setBulkErrors({});
    setBulkError('');
    setBulkSubmitting(false);
    setBulkConfirmPending(null);
    setBulkUnsavedConfirm(false);
    setBulkOperator('');
    setBulkOperatorOptions([]);
    setBulkOperatorLoading(false);
    setBulkOperatorError('');
    setBulkImportNotice('');
    setBulkTimeZone(timeZone);
  };

  const handleBulkOperatorChange = (event) => {
    setBulkOperator(event.target.value);
  };

  const handleBulkTimeZoneChange = (value) => {
    setBulkTimeZone(value);
  };

  const handleBulkRowChange = (index, field) => (event) => {
    const value = event.target.value;
    setBulkRows((prev) => {
      let nextRows = prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      );

      if (field === 'pumpState') {
        nextRows = nextRows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, pumpState: value } : row
        );

        for (let cursor = index + 1; cursor < nextRows.length; cursor += 1) {
          if (!isBulkRowPristine(nextRows[cursor])) {
            break;
          }
          nextRows = nextRows.map((row, rowIndex) =>
            rowIndex === cursor ? { ...row, pumpState: value } : row
          );
        }
      } else if (!nextRows[index].pumpState) {
        const previousPumpState = getPreviousPumpState(nextRows, index);
        nextRows = nextRows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, pumpState: previousPumpState } : row
        );
      }

      setBulkErrors((prevErrors) => {
        let nextErrors = clearBulkErrorField(prevErrors, index, field);
        if (field === 'time' && value) {
          nextErrors = clearBulkErrorField(nextErrors, index, 'order');
          nextErrors = clearBulkErrorField(nextErrors, index + 1, 'time');
          nextErrors = clearBulkErrorField(nextErrors, index + 1, 'order');
        }

        if (field === 'date' && value) {
          nextErrors = clearBulkErrorField(nextErrors, index, 'order');
        }

        return applyBulkChronologyErrors(nextRows, nextErrors, parseBulkRowDateTime);
      });

      return nextRows;
    });
  };

  const handleBulkTimeBlur = (index) => () => {
    setBulkRows((prev) => {
      const currentRow = prev[index];
      const followingRow = prev[index + 1];
      const timeValue = (currentRow?.time || '').trim();

      if (!timeValue || !followingRow || (followingRow.time || '').trim()) {
        return prev;
      }

      const nextRows = prev.map((row, rowIndex) =>
        rowIndex === index + 1 ? { ...row, time: timeValue } : row
      );

      setBulkErrors((prevErrors) => {
        let nextErrors = clearBulkErrorField(prevErrors, index + 1, 'time');
        nextErrors = clearBulkErrorField(nextErrors, index + 1, 'order');

        return applyBulkChronologyErrors(nextRows, nextErrors, parseBulkRowDateTime);
      });

      return nextRows;
    });
  };

  const handleBulkRowDelete = (index) => () => {
    setBulkRows((prev) => {
      const fallbackPumpState = getPreviousPumpState(prev, index);
      const nextRows = prev.map((row, rowIndex) =>
        rowIndex === index ? emptyBulkRow(fallbackPumpState) : row
      );

      setBulkErrors(() => {
        const { errors } = validateBulkRows(nextRows);
        return errors;
      });

      setBulkError('');
      return nextRows;
    });
  };

  const validateBulkRows = (rows) => {
    const errors = {};
    const payload = [];
    let lastRecordedAt = null;
    let lastPumpState = defaultPumpState;
    let hasChronologyError = false;

    rows.forEach((row, index) => {
      const trimmedComment = row.comment?.trim() || '';
      const hasDepth = row.depthToWater !== '' && row.depthToWater != null;

      if (!hasDepth) {
        return;
      }

      const rowErrors = {};
      const depthValue = Number(row.depthToWater);
      if (Number.isNaN(depthValue)) {
        rowErrors.depthToWater = true;
      }

      if (!row.date) {
        rowErrors.date = true;
      }

      if (!(row.time || '').trim()) {
        rowErrors.time = true;
      }

      let recordedAt;
      if (!rowErrors.date && !rowErrors.time) {
        const parsed = parseBulkRowDateTime(row);
        if (!parsed || Number.isNaN(parsed.getTime())) {
          rowErrors.time = true;
        } else {
          if (lastRecordedAt && parsed.getTime() < lastRecordedAt.getTime()) {
            rowErrors.time = true;
            rowErrors.order = true;
            hasChronologyError = true;
          } else {
            recordedAt = parsed.toISOString();
          }
        }
      }

      if (Object.keys(rowErrors).length > 0) {
        errors[index] = rowErrors;
        return;
      }

      lastRecordedAt = recordedAt ? new Date(recordedAt) : null;
      const pumpState = row.pumpState === 'on' ? 'on' : row.pumpState === 'off' ? 'off' : lastPumpState;
      lastPumpState = pumpState;

      const roundedDepth = Math.round(depthValue * 100) / 100;
      payload.push({
        depthToWater: roundedDepth,
        pumpState,
        comment: trimmedComment || undefined,
        recordedAt
      });
    });

    return { errors, payload, hasChronologyError };
  };

  const handleBulkCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBulkError('');
    setBulkImportNotice('');

    try {
      const content = await file.text();
      const { dataRows } = parseBulkCsvRows(content);
      if (dataRows.length === 0) {
        setBulkError(t('No rows were found in that CSV file.'));
        return;
      }

      const importedRows = dataRows
        .map((row, index) => ({ ...row, _index: index }))
        .sort((rowA, rowB) => {
          const parsedA =
            rowA.date && rowA.time
              ? parseDateTimeInTimeZone(`${rowA.date}T${rowA.time}`, bulkTimeZone || timeZone)
              : null;
          const parsedB =
            rowB.date && rowB.time
              ? parseDateTimeInTimeZone(`${rowB.date}T${rowB.time}`, bulkTimeZone || timeZone)
              : null;
          const timeA = parsedA && !Number.isNaN(parsedA.getTime()) ? parsedA.getTime() : null;
          const timeB = parsedB && !Number.isNaN(parsedB.getTime()) ? parsedB.getTime() : null;

          if (timeA == null || timeB == null) {
            return rowA._index - rowB._index;
          }

          return timeA - timeB;
        });
      let currentPumpState = defaultPumpState;
      const nextRows = importedRows.map((row) => {
        const inferredPumpState = inferPumpStateFromComment(row.comment);
        const resolvedPumpState = inferredPumpState || currentPumpState;
        currentPumpState = resolvedPumpState;
        return {
          date: row.date || defaultDateOnly(bulkTimeZone || timeZone),
          time: row.time,
          depthToWater: roundDepthToWater(row.depthToWater),
          pumpState: resolvedPumpState,
          pumpStateAssumed: Boolean(inferredPumpState),
          comment: row.comment
        };
      });

      const filledRows =
        nextRows.length >= BULK_ROW_COUNT
          ? nextRows
          : [
              ...nextRows,
              ...Array.from({ length: Math.max(0, BULK_ROW_COUNT - nextRows.length) }, () =>
                emptyBulkRow(currentPumpState)
              )
            ];

      const { errors } = validateBulkRows(filledRows);
      setBulkRows(filledRows);
      setBulkErrors(errors);
      setBulkError('');
      setBulkImportNotice(t('Imported {count} rows from the CSV.', { count: nextRows.length }));
    } catch (error) {
      setBulkError(error.message || t('Unable to import CSV.'));
    } finally {
      event.target.value = '';
    }
  };

  const handleBulkSaveRequest = () => {
    if (!bulkOperator?.trim()) {
      setBulkError(t('Select an operator before saving.'));
      return;
    }
    if (!bulkTimeZone) {
      setBulkError(t('Select a time zone before saving.'));
      return;
    }

    const { errors, payload, hasChronologyError } = validateBulkRows(bulkRows);
    setBulkErrors(errors);
    if (Object.keys(errors).length > 0) {
      const errorMessage = hasChronologyError
        ? t('Each measurement must be at or after the previous entry.')
        : t('Please fix the highlighted fields before saving.');
      setBulkError(errorMessage);
      return;
    }
    if (payload.length === 0) {
      setBulkError(t('Enter at least one measurement to continue.'));
      return;
    }
    setBulkError('');
    setBulkConfirmPending({ count: payload.length, payload });
  };

  const handleBulkConfirmSave = async () => {
    if (!bulkConfirmPending || !bulkWellModal) {
      return;
    }
    try {
      setBulkSubmitting(true);
      await onRecordWellBulk(bulkWellModal.id, {
        operator: bulkOperator?.trim() || undefined,
        measurements: bulkConfirmPending.payload
      });
      closeBulkWellModal();
    } catch (error) {
      setBulkError(error.message || t('Unable to save measurement.'));
    } finally {
      setBulkSubmitting(false);
      setBulkConfirmPending(null);
    }
  };

  const cancelBulkConfirmation = () => {
    setBulkConfirmPending(null);
  };

  const handleBulkCancel = () => {
    if (bulkSubmitting) {
      return;
    }
    const hasChanges = bulkRows.some((row) => !isBulkRowPristine(row));
    if (hasChanges) {
      setBulkUnsavedConfirm(true);
      return;
    }
    closeBulkWellModal();
  };

  const discardBulkChanges = () => {
    setBulkUnsavedConfirm(false);
    closeBulkWellModal();
  };

  const continueBulkEditing = () => {
    setBulkUnsavedConfirm(false);
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
      if (!recordForm.depthToWater) {
        setRecordError(t('Depth to water is required.'));
        return;
      }

      try {
        setRecordSubmitting(true);
        await onRecordWell(feature.id, {
          depthToWater: Number(recordForm.depthToWater),
          pumpState: recordForm.pumpState === 'on' ? 'on' : 'off',
          comment: recordForm.comment?.trim() || undefined,
          recordedAt: toRecordedAtIso(recordForm.recordedAt),
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
          recordedAt: toRecordedAtIso(recordForm.recordedAt),
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
          recordedAt: toRecordedAtIso(recordForm.recordedAt),
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
        <div className="feature-summary-header">
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
        </div>
        {features.length === 0 ? (
          <p className="empty">{t('No features recorded for this site yet.')}</p>
        ) : filteredFeatures.length === 0 ? (
          <p className="empty">{t('No features match the selected filters.')}</p>
        ) : (
          <div className="feature-groups">
            {visibleTypes.well && (
              <div className="feature-group">
                <div className="feature-group-header">
                  <div>
                    <h3>{t('Wells')}</h3>
                    <p className="feature-group-count">
                      {t('{count} wells', { count: site.wells.length })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={openWellAnalysis}
                    disabled={site.wells.length === 0}
                  >
                    {t('Analyze')}
                  </button>
                </div>
                {site.wells.length === 0 ? (
                  <p className="empty">{t('No wells recorded for this site yet.')}</p>
                ) : (
                  <div className="asset-grid">
                    {site.wells.map((well) => (
                      <WellCard
                        key={`well-${well.id}`}
                        well={well}
                        onViewHistory={(target) => openHistoryModal('well', target)}
                        onAddMeasurement={
                          canRecordMeasurements ? (target) => openRecordModal('well', target) : undefined
                        }
                        onAddBulkMeasurement={
                          canRecordMeasurements ? (target) => openBulkWellModal(target) : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {visibleTypes.tank && (
              <div className="feature-group">
                <div className="feature-group-header">
                  <div>
                    <h3>{t('Tanks')}</h3>
                    <p className="feature-group-count">
                      {t('{count} tanks', { count: site.tanks.length })}
                    </p>
                  </div>
                </div>
                {site.tanks.length === 0 ? (
                  <p className="empty">{t('No tanks recorded for this site yet.')}</p>
                ) : (
                  <div className="asset-grid">
                    {site.tanks.map((tank) => (
                      <TankCard
                        key={`tank-${tank.id}`}
                        tank={tank}
                        onViewHistory={(target) => openHistoryModal('tank', target)}
                        onAddReading={
                          canRecordMeasurements ? (target) => openRecordModal('tank', target) : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {visibleTypes.flowmeter && (
              <div className="feature-group">
                <div className="feature-group-header">
                  <div>
                    <h3>{t('Flowmeters')}</h3>
                    <p className="feature-group-count">
                      {t('{count} flowmeters', { count: site.flowmeters.length })}
                    </p>
                  </div>
                </div>
                {site.flowmeters.length === 0 ? (
                  <p className="empty">{t('No flowmeters recorded for this site yet.')}</p>
                ) : (
                  <div className="asset-grid">
                    {site.flowmeters.map((flowmeter) => (
                      <FlowmeterCard
                        key={`flowmeter-${flowmeter.id}`}
                        flowmeter={flowmeter}
                        onViewHistory={(target) => openHistoryModal('flowmeter', target)}
                        onAddReading={
                          canRecordMeasurements
                            ? (target) => openRecordModal('flowmeter', target)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {wellAnalysisOpen && (
        <div className="history-fullscreen" role="dialog" aria-modal="true">
          <div className="history-fullscreen-header">
            <div>
              <h2>{t('Well analysis')}</h2>
              <p className="history-fullscreen-subtitle">
                {t('Compare well measurements across the site.')}
              </p>
            </div>
            <div className="history-fullscreen-actions">
              <button type="button" className="history-close-button" onClick={closeWellAnalysis}>
                {t('Close')}
              </button>
            </div>
          </div>
          <div className="history-fullscreen-body">
            <div className="well-analysis-controls">
              <form className="history-chart-controls" onSubmit={handleWellAnalysisSubmit}>
                <label>
                  {t('From')}
                  <input
                    type="datetime-local"
                    value={wellAnalysisForm.from}
                    onChange={handleWellAnalysisFormChange('from')}
                  />
                </label>
                <label>
                  {t('To')}
                  <input
                    type="datetime-local"
                    value={wellAnalysisForm.to}
                    onChange={handleWellAnalysisFormChange('to')}
                  />
                </label>
                <div className="history-chart-buttons">
                  <button type="submit" disabled={wellAnalysisState.loading}>
                    {wellAnalysisState.loading ? t('Loading data…') : t('Apply')}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleWellAnalysisReset}
                    disabled={wellAnalysisState.loading}
                  >
                    {t('Reset')}
                  </button>
                </div>
              </form>
              <div className="well-analysis-toggles">
                {wellSeries.map((serie) => {
                  const isVisible = wellAnalysisVisibility[serie.key] !== false;
                  return (
                    <button
                      key={serie.key}
                      type="button"
                      className={`well-toggle${isVisible ? ' active' : ''}`}
                      onClick={() => toggleWellSeriesVisibility(serie.key)}
                      aria-pressed={isVisible}
                    >
                      <span className="well-toggle-swatch" style={{ background: serie.color }} />
                      {serie.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {wellAnalysisState.error ? (
              <p className="form-error">{wellAnalysisState.error}</p>
            ) : wellAnalysisState.loading && wellAnalysisState.items.length === 0 ? (
              <p className="history-status">{t('Loading data…')}</p>
            ) : (
              <HistoryChart
                data={wellAnalysisState.items}
                series={visibleWellSeries}
                invertYAxis
              />
            )}
          </div>
        </div>
      )}

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
                    series={historyChartSeries[historyModal.type] || []}
                    invertYAxis={historyModal.type === 'well'}
                    onPointClick={handleChartPointSelect}
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
                            <tr
                              key={item.id}
                              className={historyDeletingId === item.id ? 'history-row-deleting' : undefined}
                            >
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

      {bulkWellModal && (
        <Modal
          title={t('Add bulk measurements')}
          onClose={handleBulkCancel}
          dismissDisabled={bulkSubmitting}
          actions={
            <>
              <button type="button" className="secondary" onClick={handleBulkCancel} disabled={bulkSubmitting}>
                {t('Cancel')}
              </button>
              <button type="button" onClick={handleBulkSaveRequest} disabled={bulkSubmitting}>
                {bulkSubmitting ? t('Saving…') : t('Save')}
              </button>
            </>
          }
        >
          <div className="bulk-controls">
            <label>
              {t('Operator')}
              <select
                value={bulkOperator}
                onChange={handleBulkOperatorChange}
                disabled={!canSelectBulkOperator || bulkOperatorLoading}
              >
                {bulkOperatorLoading && bulkOperatorOptionsList.length === 0 && (
                  <option value="">{t('Loading operators…')}</option>
                )}
                {!bulkOperator && <option value="">{t('Select an operator')}</option>}
                {bulkOperatorOptionsList.map((operator) => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('Time zone')}
              <TimeZoneSelect
                value={bulkTimeZone}
                onChange={handleBulkTimeZoneChange}
                placeholder={t('Search time zones…')}
              />
            </label>
            <label className="bulk-upload">
              {t('Import CSV')}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleBulkCsvUpload}
                disabled={bulkSubmitting}
              />
            </label>
          </div>
          <p className="bulk-helper-text">
            {t('CSV columns: Date, Time, Depth to water (in meters), Comments.')}
          </p>
          <p className="bulk-helper-text">
            {t('Yellow rows indicate a pump state inferred from comments.')}
          </p>
          {bulkOperatorError && <p className="form-error">{bulkOperatorError}</p>}
          {bulkImportNotice && <p className="bulk-import-notice">{bulkImportNotice}</p>}
          <div className="bulk-grid-wrapper">
            <table className="bulk-grid">
              <thead>
                <tr>
                  <th>{t('Date')}</th>
                  <th>{t('Time')}</th>
                  <th>{t('Depth to water (m)')}</th>
                  <th>{t('Pump state')}</th>
                  <th className="bulk-comment-column">{t('Comment')}</th>
                  <th className="bulk-actions-column">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, index) => {
                  const rowErrors = bulkErrors[index] || {};
                  const hasContent = !isBulkRowPristine(row);
                  return (
                    <tr
                      key={`bulk-row-${index}`}
                      className={row.pumpStateAssumed ? 'bulk-row-assumed' : undefined}
                    >
                      <td>
                        <input
                          type="date"
                          value={row.date}
                          onChange={handleBulkRowChange(index, 'date')}
                          className={rowErrors.date || rowErrors.order ? 'input-error' : ''}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          value={row.time}
                          onChange={handleBulkRowChange(index, 'time')}
                          onBlur={handleBulkTimeBlur(index)}
                          className={rowErrors.time || rowErrors.order ? 'input-error' : ''}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.depthToWater}
                          onChange={handleBulkRowChange(index, 'depthToWater')}
                          className={rowErrors.depthToWater ? 'input-error' : ''}
                        />
                      </td>
                      <td>
                        <select value={row.pumpState} onChange={handleBulkRowChange(index, 'pumpState')}>
                          <option value="on">{t('On')}</option>
                          <option value="off">{t('Off')}</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.comment}
                          onChange={handleBulkRowChange(index, 'comment')}
                        />
                      </td>
                      <td className="bulk-actions-column">
                        <button
                          type="button"
                          className="bulk-delete-button"
                          onClick={handleBulkRowDelete(index)}
                          disabled={!hasContent || bulkSubmitting}
                        >
                          {t('Delete')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="bulk-helper-text">
            {t(
              'Only rows with depth to water or a comment will be saved. Empty rows are discarded automatically.'
            )}
          </p>
          {bulkError && <p className="form-error">{bulkError}</p>}
        </Modal>
      )}

      {bulkConfirmPending && bulkWellModal && (
        <Modal
          title={t('Confirm bulk save')}
          onClose={cancelBulkConfirmation}
          dismissDisabled={bulkSubmitting}
          actions={
            <>
              <button
                type="button"
                className="secondary"
                onClick={cancelBulkConfirmation}
                disabled={bulkSubmitting}
              >
                {t('Cancel')}
              </button>
              <button type="button" onClick={handleBulkConfirmSave} disabled={bulkSubmitting}>
                {bulkSubmitting ? t('Saving…') : t('Save')}
              </button>
            </>
          }
        >
          <p>{t('You are saving {count} measurements. Save?', { count: bulkConfirmPending.count })}</p>
        </Modal>
      )}

      {bulkUnsavedConfirm && (
        <Modal
          title={t('Leave bulk editor?')}
          onClose={continueBulkEditing}
          dismissDisabled={bulkSubmitting}
          actions={
            <>
              <button type="button" className="secondary" onClick={continueBulkEditing} disabled={bulkSubmitting}>
                {t('Continue editing')}
              </button>
              <button type="button" onClick={discardBulkChanges} disabled={bulkSubmitting}>
                {t('Discard and exit')}
              </button>
            </>
          }
        >
          <p>{t('You have unsaved measurements. Are you sure you want to leave?')}</p>
        </Modal>
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
                <>
                  <label>
                    {t('Depth to water (m)')}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={recordForm.depthToWater}
                      onChange={handleRecordChange('depthToWater')}
                      required
                    />
                  </label>
                  <label>
                    {t('Pump state')}
                    <select value={recordForm.pumpState} onChange={handleRecordChange('pumpState')}>
                      <option value="on">{t('On')}</option>
                      <option value="off">{t('Off')}</option>
                    </select>
                  </label>
                </>
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
              {t('Logged in as {name}', { name: displayUserName })}
            </p>
            {recordError && <p className="form-error">{recordError}</p>}
          </form>
        </Modal>
      )}
    </div>
  );
}
