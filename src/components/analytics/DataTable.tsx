import { memo } from 'react';
import { Badge } from '@/components/ui/badge';

interface TableColumn {
  key: string;
  label: string;
  format?: 'number' | 'percentage' | 'url';
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
  const formatValue = (value: any, format?: string) => {
    // Handle null/undefined values
    if (value === null || value === undefined || value === '') {
      return format === 'number' ? '0' : format === 'percentage' ? '0%' : '-';
    }

    if (format === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) return '0';
      return numValue > 1000 ? `${(numValue / 1000).toFixed(0)}K` : numValue.toLocaleString();
    }
    if (format === 'percentage') {
      const numValue = Number(value);
      if (isNaN(numValue)) return '0%';
      return `${numValue}%`;
    }
    if (format === 'url') {
      const strValue = String(value || '');
      return strValue.length > 30 ? `${strValue.substring(0, 30)}...` : strValue;
    }
    return String(value || '-');
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (index === 1) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    if (index === 2) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  const displayData = data.slice(0, maxRows);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
                  Rank
                </th>
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {displayData.map((row, index) => (
                <tr 
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    <Badge 
                      variant="outline" 
                      className={`${getRankBadge(index)} border-0 font-bold text-xs px-1.5 py-0.5`}
                    >
                      #{index + 1}
                    </Badge>
                  </td>
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                    >
                      {column.format === 'url' ? (
                        <div className="max-w-xs">
                          <div className="truncate font-mono text-xs bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                            {formatValue(row[column.key], column.format)}
                          </div>
                        </div>
                      ) : (
                        <span className={`${column.format === 'number' ? 'font-semibold' : ''} text-xs`}>
                          {formatValue(row[column.key], column.format)}
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
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Showing top {maxRows} of {data.length} results
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

DataTable.displayName = 'DataTable'; 