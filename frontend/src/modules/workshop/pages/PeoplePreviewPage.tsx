import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, Truck, UserCheck } from 'lucide-react';
import { useData } from '@/modules/workshop/context/DataContext';
import { supplyApi } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { toPersianDigits } from '@/utils/persian';

interface CategoryCount {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  count: number;
  route: string;
  permissionLabel: string;
}

export const PeoplePreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { sellers, staffMembers, owners } = useData();
  const [supplierCount, setSupplierCount] = useState<number>(0);
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const suppliersRes = await supplyApi.listSuppliers({ limit: 100 }).catch(() => ({ rows: [], total: 0 }));
        if (!cancelled) {
          setSupplierCount(suppliersRes.total ?? suppliersRes.rows.length);
        }
      } catch {
        if (!cancelled) setSupplierCount(0);
      }

      try {
        const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });
        if (!cancelled) {
          if (error) {
            setUserCount(0);
          } else {
            setUserCount(data?.users?.length ?? 0);
          }
        }
      } catch {
        if (!cancelled) setUserCount(0);
      }

      if (!cancelled) setLoading(false);
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const categories: CategoryCount[] = [
    {
      id: 'sellers',
      label: 'فروشندگان',
      icon: Users,
      count: sellers.length,
      route: '/console/people/sellers',
      permissionLabel: 'people.view',
    },
    {
      id: 'staff',
      label: 'کارکنان کارگاه',
      icon: Briefcase,
      count: staffMembers.length + owners.length,
      route: '/console/people/staff',
      permissionLabel: 'people.view',
    },
    {
      id: 'suppliers',
      label: 'تأمین‌کنندگان',
      icon: Truck,
      count: supplierCount,
      route: '/console/people/suppliers',
      permissionLabel: 'suppliers.view',
    },
    {
      id: 'users',
      label: 'کاربران',
      icon: UserCheck,
      count: userCount,
      route: '/console/people/users',
      permissionLabel: 'settings.manage',
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-brand" />
        <h1 className="text-2xl font-black text-stone-900 dark:text-white">افراد</h1>
      </div>

      <p className="text-sm text-stone-600 dark:text-gray-300">
        مرکز مدیریت تمام افراد، فروشندگان، تأمین‌کنندگان، پرسنل کارگاه و کاربران سیستم
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel h-32 rounded-2xl animate-pulse">
              <div className="h-full w-full bg-stone-200 dark:bg-stone-700 rounded-2xl"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(cat.route)}
                className="glass-panel p-5 rounded-2xl text-right hover:bg-stone-100/80 dark:hover:bg-white/5 transition-all duration-200 group cursor-pointer border border-black/5 dark:border-white/10"
              >
                <div className="flex items-end justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand-hover text-brand-on flex items-center justify-center shadow-md">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-black text-stone-900 dark:text-white">
                    {toPersianDigits(cat.count)}
                  </div>
                </div>
                <h3 className={`font-black text-sm ${
                  cat.count === 0
                    ? 'text-stone-500 dark:text-gray-500'
                    : 'text-stone-800 dark:text-gray-200 group-hover:text-brand'
                }`}>
                  {cat.label}
                </h3>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PeoplePreviewPage;
