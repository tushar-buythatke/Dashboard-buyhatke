import { memo, ReactNode, useMemo } from 'react';
import { formatCount, formatSmartPercent } from '@/lib/format';

interface TableColumn {
  key: string;
  label: string;
  format?: 'number' | 'percentage' | 'url' | 'compact';
  icon?: ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Max decimals for percentage (default 2). */
  percentDecimals?: number;
}

interface DataTableProps {
  title: string;
  data: any[];
  columns: TableColumn[];
  maxRows?: number;
}

const RANK_BADGE_CLASS = ['halo-badge-warn', 'halo-badge', 'halo-badge-iris', 'halo-badge-iris'];

export const DataTable = memo<DataTableProps>(({
  title,
  data,
  columns,
  maxRows = 5
}) => {
  const formatValue = (value: any, format?: string, percentDecimals?: number) => {
    if (value === null || value === undefined || value === '') {
      if (format === 'number' || format === 'compact') return '0';
      if (format === 'percentage') return '0%';
      return '—';
    }
    if (format === 'number' || format === 'compact') {
      return formatCount(value);
    }
    if (format === 'percentage') {
      return formatSmartPercent(value, percentDecimals ?? 4);
    }
    if (format === 'url') {
      const strValue = String(value || '');
      return strValue.length > 30 ? `${strValue.substring(0, 30)}…` : strValue;
    }
    return String(value || '—');
  };

  const getRankBadge = (index: number) => RANK_BADGE_CLASS[Math.min(index, RANK_BADGE_CLASS.length - 1)];

  const displayData = data.slice(0, maxRows);

  /* Share-of-column-max for the first numeric column — the fast-scan bar. */
  const numericColKey = useMemo(
    () => columns.find((c) => c.format === 'number' || c.format === 'compact')?.key,
    [columns]
  );
  const colMax = useMemo(() => {
    if (!numericColKey) return 0;
    return displayData.reduce((max, row) => Math.max(max, Number(row[numericColKey]) || 0), 0);
  }, [displayData, numericColKey]);

  if (!data || data.length === 0) {
    return (
      <div className="space-y-2">
        {title && <h3 className="halo-heading">{title}</h3>}
        <div className="halo-card p-8 flex flex-col items-center justify-center text-center gap-1.5">
          <p className="halo-heading" style={{ fontSize: 13 }}>No data yet</p>
          <p className="halo-subtitle">Try a different date range or filter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && <h3 className="halo-heading">{title}</h3>}

      <div className="halo-card overflow-hidden">
        <div className="overflow-x-auto halo-scroll-x">
          <table className="halo-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={column.align === 'right' ? 'col-num' : ''}
                    style={{ textAlign: column.align === 'center' ? 'center' : column.align === 'right' ? 'right' : 'left' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.icon && <span className="text-[var(--h-iris-600)] opacity-80">{column.icon}</span>}
                      {column.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, index) => (
                <tr key={index}>
                  <td>
                    <span className={`halo-badge ${getRankBadge(index)}`} style={{ minWidth: 20, justifyContent: 'center' }}>
                      {index + 1}
                    </span>
                  </td>
                  {columns.map((column) => {
                    const isNumeric = column.format === 'number' || column.format === 'compact';
                    const showShareBar = isNumeric && column.key === numericColKey && colMax > 0;
                    const share = showShareBar ? Math.max(4, (Number(row[column.key]) || 0) / colMax * 100) : 0;
                    return (
                      <td
                        key={column.key}
                        className={column.align === 'right' || isNumeric ? 'col-num' : ''}
                        style={{
                          position: 'relative',
                          textAlign: column.align === 'center' ? 'center' : (column.align === 'right' || isNumeric) ? 'right' : 'left',
                        }}
                      >
                        {showShareBar && (
                          <span
                            aria-hidden
                            style={{
                              position: 'absolute',
                              inset: '4px 0',
                              right: 0,
                              width: `${share}%`,
                              background: 'var(--h-tint)',
                              borderRadius: 4,
                              zIndex: 0,
                            }}
                          />
                        )}
                        {column.format === 'url' ? (
                          <div className="max-w-xs" style={{ position: 'relative', zIndex: 1 }}>
                            <div className="halo-inset truncate font-mono text-[10.5px] px-1.5 py-0.5">
                              {formatValue(row[column.key], column.format, column.percentDecimals)}
                            </div>
                          </div>
                        ) : (
                          <span
                            className={isNumeric ? 'num font-semibold' : column.format === 'percentage' ? 'num font-semibold text-[var(--h-iris-600)]' : ''}
                            style={{ position: 'relative', zIndex: 1 }}
                          >
                            {formatValue(row[column.key], column.format, column.percentDecimals)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length > maxRows && (
          <div className="px-3 py-2 border-t border-[var(--h-line)]">
            <p className="halo-subtitle text-center">
              Showing top {maxRows} of {data.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

DataTable.displayName = 'DataTable';
