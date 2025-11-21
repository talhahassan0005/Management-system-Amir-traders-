import Link from 'next/link';
import Layout from '@/components/Layout/Layout';
import {
  Layers,
  FileText,
  Wallet,
  CreditCard,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
  Users,
} from 'lucide-react';

type ReportCard = { name: string; href: string; desc: string; icon: 'layers'|'file'|'wallet'|'credit'|'clipboard'|'up'|'down'|'bar'|'pie'|'users' };

const reports: ReportCard[] = [
  { name: 'Purchase Report', href: '/reports/purchase-report', desc: 'View all purchase invoices with filters', icon: 'file' },
  { name: 'Sale Report', href: '/reports/sale-report', desc: 'View all sale invoices with filters', icon: 'file' },
  { name: 'Store Report', href: '/reports/store-report', desc: 'View all store transactions with filters', icon: 'file' },
  { name: 'Inventory Valuation', href: '/reports/inventory-valuation', desc: 'Open Inventory Valuation', icon: 'layers' },
  { name: 'Income Statement', href: '/reports/income-statement', desc: 'Open Income Statement', icon: 'file' },
  { name: 'Balance Sheet', href: '/reports/balance-sheet', desc: 'Open Balance Sheet', icon: 'file' },
  { name: 'Receivables', href: '/reports/receivables', desc: 'Open Receivables', icon: 'wallet' },
  { name: 'Payables', href: '/reports/payables', desc: 'Open Payables', icon: 'credit' },
  { name: 'Cash Inflow/Outflow', href: '/reports/cash-inflow-outflow', desc: 'Open Cash Inflow/Outflow', icon: 'wallet' },
  { name: 'Expense Recording', href: '/reports/expense-recording', desc: 'Open Expense Recording', icon: 'clipboard' },
  { name: 'Trial Balance', href: '/reports/trial-balance', desc: 'Open Trial Balance', icon: 'file' },
  { name: 'Cash Sales Value', href: '/reports/cash-sales-value', desc: 'Open Cash Sales Value', icon: 'up' },
  { name: 'Credit Sales Value', href: '/reports/credit-sales-value', desc: 'Open Credit Sales Value', icon: 'down' },
  { name: 'High Sale Product', href: '/reports/high-sale-product', desc: 'Open High Sale Product', icon: 'bar' },
  { name: 'Low Sale Product', href: '/reports/low-sale-product', desc: 'Open Low Sale Product', icon: 'bar' },
  { name: 'Graphs', href: '/reports/graphs', desc: 'Open Graphs', icon: 'pie' },
  { name: 'Item-wise PnL', href: '/reports/item-wise-pnl', desc: 'Open Item-wise PnL', icon: 'bar' },
  { name: 'Customer-wise Profits', href: '/reports/customer-wise-profits', desc: 'Open Customer-wise Profits', icon: 'users' },
  { name: 'Inventory Valuation (detailed)', href: '/reports/inventory-valuation-detailed', desc: 'Open Inventory Valuation (detailed)', icon: 'layers' },
];

const IconFor = ({ icon }: { icon: ReportCard['icon'] }) => {
  const common = 'w-6 h-6';
  switch (icon) {
    case 'layers': return <Layers className={common} />;
    case 'file': return <FileText className={common} />;
    case 'wallet': return <Wallet className={common} />;
    case 'credit': return <CreditCard className={common} />;
    case 'clipboard': return <ClipboardList className={common} />;
    case 'up': return <TrendingUp className={common} />;
    case 'down': return <TrendingDown className={common} />;
    case 'bar': return <BarChart2 className={common} />;
    case 'pie': return <PieChart className={common} />;
    case 'users': return <Users className={common} />;
    default: return <FileText className={common} />;
  }
};

export default function ReportsIndex() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-gray-600">Access financial and inventory reports</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600 ring-1 ring-inset ring-blue-100">
                  <IconFor icon={r.icon} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{r.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-1">{r.desc}</p>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
