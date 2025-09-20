import { memo } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: LucideIcon;
  color: string;
}

// Memoized change color and icon functions
const getChangeColor = (changeType: 'increase' | 'decrease' | 'neutral') => {
  switch (changeType) {
    case 'increase':
      return 'text-green-600 bg-green-100';
    case 'decrease':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getChangeIcon = (changeType: 'increase' | 'decrease' | 'neutral') => {
  switch (changeType) {
    case 'increase':
      return '↗';
    case 'decrease':
      return '↘';
    default:
      return '→';
  }
};

function StatsCard({ title, value, change, changeType, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <div className="flex items-center mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getChangeColor(changeType)}`}>
              <span className="mr-1">{getChangeIcon(changeType)}</span>
              {change}
            </span>
            <span className="text-sm text-gray-500 ml-2">from last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${color} transition-transform duration-200 hover:scale-105`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default memo(StatsCard);
