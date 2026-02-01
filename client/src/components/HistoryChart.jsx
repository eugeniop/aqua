import { useMemo, useState } from 'react';
import { useTranslation } from '../i18n/LocalizationProvider.jsx';
import './HistoryChart.css';

const PADDING = { top: 16, right: 24, bottom: 40, left: 56 };
const HEIGHT = 280;
const WIDTH = 720;
const TICK_COUNT = 4;

const buildPath = (points, scaleX, scaleY) => {
  if (!points.length) {
    return '';
  }
  return points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      const x = scaleX(point.time).toFixed(2);
      const y = scaleY(point.value).toFixed(2);
      return `${command}${x},${y}`;
    })
    .join(' ');
};

const createScale = (domainStart, domainEnd, rangeStart, rangeEnd) => {
  const domainSpan = domainEnd - domainStart || 1;
  const rangeSpan = rangeEnd - rangeStart;
  return (value) => {
    if (domainSpan === 0) {
      return (rangeStart + rangeEnd) / 2;
    }
    return rangeStart + ((value - domainStart) / domainSpan) * rangeSpan;
  };
};

const buildTicks = (start, end, count) => {
  if (count <= 1) {
    return [start];
  }
  const span = end - start;
  if (span === 0) {
    return [start];
  }
  return Array.from({ length: count }, (_, index) => start + (span * index) / (count - 1));
};

export default function HistoryChart({
  data,
  series = [],
  width = WIDTH,
  height = HEIGHT,
  invertYAxis = false
}) {
  const { t, formatDateTime } = useTranslation();
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const prepared = useMemo(() => {
    const parsed = (data || [])
      .map((item) => {
        const time = new Date(item.recordedAt).getTime();
        return {
          time,
          raw: item
        };
      })
      .filter((item) => !Number.isNaN(item.time))
      .sort((a, b) => a.time - b.time);

    const seriesWithPoints = series.map((serie) => ({
      ...serie,
      points: parsed
        .map((entry) => {
          const rawValue = entry.raw[serie.key];
          if (rawValue == null || rawValue === '') {
            return null;
          }
          const value = Number(rawValue);
          if (Number.isNaN(value)) {
            return null;
          }
          return {
            time: entry.time,
            value,
            recordedAt: entry.raw.recordedAt,
            label: serie.label,
            original: rawValue
          };
        })
        .filter(Boolean)
    }));

    return { parsed, seriesWithPoints };
  }, [data, series]);

  const allPoints = useMemo(
    () => prepared.seriesWithPoints.flatMap((serie) => serie.points),
    [prepared.seriesWithPoints]
  );

  if (allPoints.length < 2) {
    return (
      <div className="history-chart-empty">
        <p>{t('Not enough data to display a chart yet.')}</p>
      </div>
    );
  }

  const minTime = Math.min(...allPoints.map((point) => point.time));
  const maxTime = Math.max(...allPoints.map((point) => point.time));
  const minValue = Math.min(...allPoints.map((point) => point.value));
  const maxValue = Math.max(...allPoints.map((point) => point.value));

  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const scaleX = createScale(minTime, maxTime, PADDING.left, PADDING.left + innerWidth);
  const scaleY = invertYAxis
    ? createScale(minValue, maxValue, PADDING.top, PADDING.top + innerHeight)
    : createScale(maxValue, minValue, PADDING.top, PADDING.top + innerHeight);

  const xTicks = buildTicks(minTime, maxTime, Math.min(TICK_COUNT, prepared.parsed.length));
  const yTicks = buildTicks(minValue, maxValue, TICK_COUNT);
  const tooltipPosition = hoveredPoint
    ? {
        left: `${(hoveredPoint.cx / width) * 100}%`,
        top: `${(hoveredPoint.cy / height) * 100}%`
      }
    : null;

  return (
    <div className="history-chart">
      <div className="history-chart-canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t('History chart data')}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={innerWidth}
            height={innerHeight}
            fill="#f8fafc"
            stroke="#d0d7f5"
            strokeWidth="1"
          />
          {yTicks.map((tickValue) => {
            const y = scaleY(tickValue);
            return (
              <g key={`y-${tickValue}`}>
                <line
                  x1={PADDING.left}
                  x2={PADDING.left + innerWidth}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#475569"
                >
                  {Number(tickValue.toFixed(2))}
                </text>
              </g>
            );
          })}
          {xTicks.map((tickValue) => {
            const x = scaleX(tickValue);
            return (
              <g key={`x-${tickValue}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={PADDING.top}
                  y2={PADDING.top + innerHeight}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={PADDING.top + innerHeight + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#475569"
                >
                  {formatDateTime(tickValue)}
                </text>
              </g>
            );
          })}
          {prepared.seriesWithPoints.map((serie) => {
            const path = buildPath(
              serie.points.map((point) => ({
                time: point.time,
                value: point.value
              })),
              scaleX,
              scaleY
            );
            return (
              <g key={serie.key}>
                <path d={path} fill="none" stroke={serie.color} strokeWidth="2" />
                {serie.points.map((point, index) => {
                  const cx = scaleX(point.time);
                  const cy = scaleY(point.value);
                  return (
                    <g key={`${serie.key}-${point.time}-${index}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="3.5"
                        fill={serie.color}
                        onMouseEnter={() =>
                          setHoveredPoint({
                            cx,
                            cy,
                            label: serie.label,
                            value: point.value,
                            recordedAt: point.recordedAt
                          })
                        }
                      />
                      <title>{`${serie.label}: ${point.value.toFixed(2)}\n${formatDateTime(
                        point.recordedAt
                      )}`}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        {hoveredPoint ? (
          <div className="history-chart-tooltip" style={tooltipPosition}>
            <div className="history-chart-tooltip-label">{hoveredPoint.label}</div>
            <div className="history-chart-tooltip-value">
              {hoveredPoint.value.toFixed(2)}
            </div>
            <div className="history-chart-tooltip-time">
              {formatDateTime(hoveredPoint.recordedAt)}
            </div>
          </div>
        ) : null}
      </div>
      <div className="history-chart-legend">
        {prepared.seriesWithPoints.map((serie) => (
          <div key={serie.key} className="history-chart-legend-item">
            <span className="history-chart-legend-swatch" style={{ backgroundColor: serie.color }} />
            <span>{serie.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
