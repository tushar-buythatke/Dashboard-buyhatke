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
    if (format === 'number') {
      return value.toLocaleString();
    }
    if (format === 'percentage') {
      return `${value}%`;
    }
    if (format === 'url') {
      return value.length > 40 ? `${value.substring(0, 40)}...` : value;
    }
    return value;
  };

  const getRankBadge = (index: number) => {
    const variants = ['default', 'secondary', 'outline'];
    const colors = ['bg-yellow-100 text-yellow-800', 'bg-gray-100 text-gray-800', 'bg-orange-100 text-orange-800'];
    
    if (index === 0) return 'bg-yellow-100 text-yellow-800';
    if (index === 1) return 'bg-gray-100 text-gray-800';
    if (index === 2) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  const displayData = data.slice(0, maxRows);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge 
                      variant="outline" 
                      className={`${getRankBadge(index)} border-0 font-bold`}
                    >
                      #{index + 1}
                    </Badge>
                  </td>
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                    >
                      {column.format === 'url' ? (
                        <div className="max-w-xs">
                          <div className="truncate font-mono text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                            {formatValue(row[column.key], column.format)}
                          </div>
                        </div>
                      ) : (
                        <span className={column.format === 'number' ? 'font-semibold' : ''}>
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
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Showing top {maxRows} of {data.length} results
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

DataTable.displayName = 'DataTable'; 