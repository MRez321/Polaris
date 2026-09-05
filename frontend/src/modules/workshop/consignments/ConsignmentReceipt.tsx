import React from 'react';
import { Modal } from '@/components/common/Modal';
import type { Consignment, Seller } from '@/types';
import { formatToman, toJalaliDate, toJalaliDateTime, toPersianDigits } from '@/utils/persian';
import { Scissors, Printer } from 'lucide-react';
interface ConsignmentReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: Consignment | null;
  seller?: Seller | null;
  onOpenReturn: (c: Consignment) => void;
  onRecordPayment: (sellerId: string) => void;
}

export const ConsignmentReceipt: React.FC<ConsignmentReceiptProps> = ({
  isOpen,
  onClose,
  consignment,
  seller,
  onOpenReturn,
  onRecordPayment,
}) => {
  if (!consignment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`رسید و فاکتور واگذاری امانی شماره ${consignment.code}`}
      subtitle="سند رسمی تحویل کالای امانی کارگاه دوزندگی به فروشنده خیابانی"
      maxWidth="3xl"
    >
      <div className="space-y-6 print:p-0 text-stone-900 dark:text-white">
        {/* Printable Card Area */}
        <div className="p-6 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#141416] text-stone-900 dark:text-white shadow-md space-y-5 print:border-stone-800 print:text-black">
          {/* Header of Receipt */}
          <div className="flex items-center justify-between border-b-2 border-brand pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand/10 dark:bg-[#1E1E22] text-brand-ink dark:text-brand flex items-center justify-center font-bold border border-brand/30 dark:border-brand/40">
                <Scissors className="w-6 h-6 -rotate-45" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg tracking-tight text-stone-900 dark:text-white print:text-black">
                  کارگاه تولید و دوزندگی پولاریس استایل
                </h3>
                <p className="text-xs text-stone-500 dark:text-gray-400">
                  سند رسید و تحویل امانی کالا (Consignment Invoice)
                </p>
              </div>
            </div>

            <div className="text-left text-xs space-y-1">
              <div>
                <span className="text-stone-500 dark:text-gray-400">شماره فاکتور: </span>
                <span className="font-mono font-black text-sm text-brand-ink dark:text-brand">
                  {consignment.code}
                </span>
              </div>
              <div>
                <span className="text-stone-500 dark:text-gray-400">تاریخ صدور: </span>
                <span className="font-bold text-stone-700 dark:text-gray-200">{toJalaliDate(consignment.date)}</span>
              </div>
              <div>
                <span className="text-stone-500 dark:text-gray-400">زمان ثبت: </span>
                <span className="font-bold text-stone-700 dark:text-gray-200">{toJalaliDateTime(consignment.date)}</span>
              </div>
              <div>
                <span className="text-stone-500 dark:text-gray-400">مهلت تسویه: </span>
                <span className="font-black text-rose-600 dark:text-red-400">
                  {toJalaliDate(consignment.dueDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Seller details in receipt */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-stone-50 dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/5 text-xs">
            <div>
              <span className="text-stone-500 dark:text-gray-400 block">فروشنده / تحویل‌گیرنده:</span>
              <span className="font-bold text-stone-900 dark:text-white">{consignment.sellerName}</span>
            </div>
            <div>
              <span className="text-stone-500 dark:text-gray-400 block">شماره تماس:</span>
              <span className="font-mono font-bold text-brand-ink dark:text-brand">{seller?.phone || '-'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-stone-500 dark:text-gray-400 block">محل استقرار بساط:</span>
              <span className="truncate block text-stone-700 dark:text-gray-300 font-medium">{seller?.streetLocation || 'راسته خیابانی'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs table-stacked">
              <thead className="border-b border-stone-200 dark:border-white/10 bg-stone-100 dark:bg-[#1A1A1E] text-stone-700 dark:text-gray-300 font-bold">
                <tr>
                  <th className="p-2">ردیف</th>
                  <th className="p-2">کد</th>
                  <th className="p-2">شرح لباس / کالا</th>
                  <th className="p-2 text-center">تعداد تحویلی</th>
                  <th className="p-2 text-center">مرجوعی</th>
                  <th className="p-2 text-center">فروش رفته</th>
                  <th className="p-2">قیمت واحد امانی</th>
                  <th className="p-2">مبلغ کل (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-white/5">
                {consignment.items.map((line, index) => (
                  <tr key={index} className="hover:bg-stone-50 dark:hover:bg-white/5 transition-colors">
                    <td data-label="ردیف" className="p-2 font-mono text-stone-500 dark:text-gray-400">{toPersianDigits(index + 1)}</td>
                    <td data-label="کد" className="p-2 font-mono text-stone-500 dark:text-gray-400">{line.itemCode}</td>
                    <td data-label="شرح کالا" className="p-2 font-bold text-stone-900 dark:text-white">{line.itemName}</td>
                    <td data-label="تعداد تحویلی" className="p-2 text-center font-mono font-black text-stone-900 dark:text-white">
                      {toPersianDigits(line.quantity)}
                    </td>
                    <td data-label="مرجوعی" className="p-2 text-center font-mono text-stone-500 dark:text-gray-400">
                      {toPersianDigits(line.returnedQuantity || 0)}
                    </td>
                    <td data-label="فروش رفته" className="p-2 text-center font-mono text-emerald-600 dark:text-green-400 font-black">
                      {toPersianDigits(line.soldQuantity || 0)}
                    </td>
                    <td data-label="قیمت واحد" className="p-2 font-mono text-stone-700 dark:text-gray-300">{formatToman(line.unitPrice)}</td>
                    <td data-label="مبلغ کل" className="p-2 font-mono font-black text-stone-900 dark:text-white">
                      {formatToman(line.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-3 border-t border-stone-200 dark:border-white/10 text-xs">
            <div className="text-stone-500 dark:text-gray-400 text-[11px] space-y-1">
              <p>تحویل دهنده: {consignment.handedOverBy}</p>
              <p>توضیحات: {consignment.notes || 'سالم و بدون ایراد تحویل داده شد.'}</p>
              <p className="font-bold text-brand-ink dark:text-brand">
                قانون تسویه: دریافت‌ها به ترتیب تاریخ فاکتورها اعمال و تسویه می‌گردد.
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 p-3 rounded-xl bg-stone-50 dark:bg-[#1A1A1E] border border-stone-200 dark:border-white/10">
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-gray-400">جمع کل تحویلی:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-white">{formatToman(consignment.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-red-400 font-bold">
                <span>کسر مرجوعی کالا:</span>
                <span className="font-mono">-{formatToman(consignment.returnedAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-green-400 font-bold">
                <span>مبالغ تسویه شده:</span>
                <span className="font-mono">-{formatToman(consignment.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1.5 border-t border-stone-200 dark:border-white/10 text-stone-900 dark:text-white">
                <span>مانده بدهی این فاکتور:</span>
                <span className="font-mono text-brand-ink dark:text-brand">
                  {formatToman(consignment.remainingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-stone-300 dark:border-white/20 text-center text-xs text-stone-500 dark:text-gray-400">
            <div>
              <p className="font-bold text-stone-700 dark:text-gray-300">امضای تحویل دهنده کارگاه</p>
              <div className="h-12" />
            </div>
            <div>
              <p className="font-bold text-stone-700 dark:text-gray-300">امضا و اثر انگشت فروشنده / تحویل گیرنده</p>
              <div className="h-12" />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenReturn(consignment);
              }}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#1E1E22] dark:hover:bg-[#252525] border border-stone-300 dark:border-white/5 text-stone-800 dark:text-gray-200 text-xs sm:text-sm font-bold transition-colors"
            >
              ثبت مرجوعی برای این فاکتور
            </button>
            <button
              onClick={() => {
                onClose();
                onRecordPayment(consignment.sellerId);
              }}
              className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-on text-xs sm:text-sm font-black shadow-md transition-colors"
            >
              ثبت دریافت وجه و تسویه
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#1E1E22] dark:hover:bg-[#252525] border border-stone-300 dark:border-brand/30 text-brand-ink dark:text-brand text-xs sm:text-sm font-black shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ فاکتور رسمی</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
