import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Globe, ShoppingBag, Send, Truck, UsersRound, Search } from 'lucide-react';
import type { SalesChannel, SalesChannelType } from '@/types';
import { getApiErrorMessage, salesChannelsApi } from '@/lib/api';
import { toPersianDigits } from '@/utils/persian';
import { cn } from '@/lib/utils';

const CHANNEL_TYPE_LABELS: Record<SalesChannelType, string> = {
  website: 'وب‌سایت',
  instagram: 'اینستاگرام',
  telegram: 'تلگرام',
  bale: 'بله',
  eitaa: 'ایتیا',
  basalam: 'باسلام',
  wholesale: 'عمده‌فروشی',
  consignment: 'سفارش امانی',
  manual_retail: 'دستی',
};

const CHANNEL_TYPE_ICONS: Record<SalesChannelType, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  instagram: <ShoppingBag className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  bale: <Send className="w-4 h-4" />,
  eitaa: <Send className="w-4 h-4" />,
  basalam: <ShoppingBag className="w-4 h-4" />,
  wholesale: <UsersRound className="w-4 h-4" />,
  consignment: <Truck className="w-4 h-4" />,
  manual_retail: <ShoppingBag className="w-4 h-4" />,
};

/** Admin sales channel management: browse, view details of all sales channels. */
export const SalesChannelsPage: React.FC = () => {
  const [channels, setChannels] = useState<SalesChannel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await salesChannelsApi.list();
      setChannels(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!channels) return [];
    if (!searchTerm) return channels;
    const term = searchTerm.toLowerCase();
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.code ?? '').toLowerCase().includes(term) ||
        CHANNEL_TYPE_LABELS[c.type].toLowerCase().includes(term),
    );
  }, [channels, searchTerm]);

  const activeCount = channels?.filter((c) => c.isActive).length ?? 0;
  const inactiveCount = channels ? channels.length - activeCount : 0;

  if (!channels) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">کانال‌های فروش</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
        <button onClick={load} className="mr-2 underline">
          <RefreshCw className="w-4 h-4 inline" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-stone-500" />
          <h1 className="text-xl font-bold">کانال‌های فروش</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              {toPersianDigits(activeCount)} فعال
            </span>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300">
              {toPersianDigits(inactiveCount)} غیرفعال
            </span>
          </div>
          <button
            onClick={load}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="جستجو در کانال‌های فروش..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>کانال فروشی یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((channel) => (
            <div
              key={channel.id}
              className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 bg-white dark:bg-stone-900 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10">
                  {CHANNEL_TYPE_ICONS[channel.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium text-lg truncate">{channel.name}</h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {CHANNEL_TYPE_LABELS[channel.type]}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2 py-0.5 text-[10px] rounded-full',
                    channel.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                  )}
                >
                  {channel.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>

              {channel.description && (
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-3 line-clamp-2">
                  {channel.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  کد: {channel.code}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  ترتیب: {toPersianDigits(channel.sortOrder)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesChannelsPage;
