import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { formatToman, toPersianDigits } from '@/utils/persian';
import { SafeImage } from '@/components/common/SafeImage';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cartLineKey, useCart } from '@/context/CartContext';

/**
 * Slide-in shopping cart. Line quantities are editable, the display total is
 * a client-side estimate (the backend re-prices every line at order time).
 */
export const CartDrawer: React.FC = () => {
  const { lines, count, total, isOpen, closeCart, setQuantity, remove } = useCart();
  const navigate = useNavigate();

  const goCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="end" className="w-full sm:w-[26rem] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-stone-200/70 dark:border-white/8">
          <SheetTitle className="flex items-center gap-2 text-base font-black">
            <ShoppingBag className="w-4.5 h-4.5 text-[#A67C38] dark:text-[#CEAE80]" />
            سبد خرید
            {count > 0 && (
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                ({toPersianDigits(count)} کالا)
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">کالاهای انتخابی شما برای خرید</SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <Empty>
              <EmptyMedia variant="icon">
                <ShoppingBag />
              </EmptyMedia>
              <EmptyTitle>سبد خرید خالی است</EmptyTitle>
              <EmptyDescription>
                هنوز کالایی انتخاب نکرده‌اید؛ از فروشگاه دیدن کنید.
              </EmptyDescription>
              <Button
                variant="outline"
                className="mt-2"
                render={<Link to="/shop" onClick={closeCart} />}
              >
                رفتن به فروشگاه
              </Button>
            </Empty>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {lines.map((line) => {
                const key = cartLineKey(line.itemId, line.size, line.color);
                return (
                  <div
                    key={key}
                    className="flex gap-3 rounded-2xl border border-stone-200/70 dark:border-white/8 bg-white dark:bg-white/3 p-3"
                  >
                    <Link
                      to={`/product/${line.itemId}`}
                      onClick={closeCart}
                      className="shrink-0 w-20 h-24 rounded-xl overflow-hidden bg-stone-100 dark:bg-white/5"
                    >
                      <SafeImage
                        src={line.imageUrl}
                        alt={line.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/product/${line.itemId}`}
                          onClick={closeCart}
                          className="text-sm font-bold text-stone-900 dark:text-white line-clamp-1 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-colors"
                        >
                          {line.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(key)}
                          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          aria-label={`حذف ${line.name} از سبد`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {(line.size || line.color) && (
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {[line.size && `سایز ${line.size}`, line.color && `رنگ ${line.color}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-lg border border-stone-200 dark:border-white/10 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setQuantity(key, line.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5"
                            aria-label="افزایش تعداد"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-black text-stone-900 dark:text-white">
                            {toPersianDigits(line.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(key, line.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5"
                            aria-label="کاهش تعداد"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-black text-[#A67C38] dark:text-[#CEAE80]">
                          {formatToman(line.price * line.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SheetFooter className="px-5 py-4 border-t border-stone-200/70 dark:border-white/8 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-stone-600 dark:text-stone-300">جمع سبد</span>
                <span className="text-lg font-black text-stone-900 dark:text-white">
                  {formatToman(total)}
                </span>
              </div>
              <Separator />
              <p className="text-[11px] leading-5 text-stone-400 dark:text-stone-500">
                مبلغ نهایی بر اساس قیمت روز کالاها در هنگام ثبت سفارش محاسبه می‌شود.
              </p>
              <Button
                size="lg"
                className="w-full h-12 bg-[#CEAE80] hover:bg-[#c2a06e] text-black font-black shadow-lg shadow-[#CEAE80]/25"
                onClick={goCheckout}
              >
                ادامه و ثبت سفارش
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
