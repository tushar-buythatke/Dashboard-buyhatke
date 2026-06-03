import { memo, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
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

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-[rgba(201,138,31,0.12)] text-[var(--gold-500)] border-0';
    if (index === 1) return 'bg-[var(--bg-panel-2)] text-[var(--text-2)] border-0';
    if (index === 2) return 'bg-[var(--bg-tint-2)] text-[var(--plum-500)] border-0';
    return 'bg-[var(--bg-tint)] text-[var(--indigo-500)] border-0';
  };

  const displayData = data.slice(0, maxRows);

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-[12.5px] font-semibold tracking-tight text-[var(--text-1)]">
          {title}
        </h3>
      )}

      <div className="velvet-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg-panel-2)]">
                <th className="px-2.5 py-1.5 text-left text-[9.5px] font-semibold text-[var(--text-3)] uppercase tracking-wider w-12">
                  #
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-2.5 py-1.5 text-[9.5px] font-semibold text-[var(--text-3)] uppercase tracking-wider ${
                      column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.icon && <span className="text-[var(--indigo-500)] opacity-80">{column.icon}</span>}
                      {column.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, index) => (
                <tr
                  key={index}
                  className="velvet-row-hover border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-panel-2)] transition-colors"
                >
                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={`${getRankBadge(index)} font-semibold text-[9.5px] px-1.5 py-0`}
                    >
                      {index + 1}
                    </Badge>
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-2.5 py-1.5 whitespace-nowrap text-[11.5px] text-[var(--text-1)] ${
                        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {column.format === 'url' ? (
                        <div className="max-w-xs">
                          <div className="truncate font-mono text-[10.5px] bg-[var(--bg-panel-2)] px-1.5 py-0.5 rounded border border-[var(--line)]">
                            {formatValue(row[column.key], column.format, column.percentDecimals)}
                          </div>
                        </div>
                      ) : (
                        <span className={column.format === 'number' || column.format === 'compact' ? 'font-semibold tabular-nums' : column.format === 'percentage' ? 'font-semibold tabular-nums text-[var(--indigo-500)]' : ''}>
                          {formatValue(row[column.key], column.format, column.percentDecimals)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length > maxRows && (
          <div className="px-2.5 py-1 bg-[var(--bg-panel-2)] border-t border-[var(--line)]">
            <p className="text-[9.5px] text-[var(--text-3)] text-center">
              Showing top {maxRows} of {data.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

DataTable.displayName = 'DataTable';
