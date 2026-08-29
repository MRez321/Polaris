import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BlogPost, BlogPostStatus, BlogSection } from '@/types';
import { blogApi, getApiErrorMessage } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { SafeImage } from '@/components/common/SafeImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface EditorState {
  id: string | null;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  date: string;
  readTime: string;
  tagsInput: string;
  status: BlogPostStatus;
  sections: BlogSection[];
}

const EMPTY_EDITOR: EditorState = {
  id: null,
  slug: '',
  title: '',
  excerpt: '',
  image: '',
  imageAlt: '',
  date: '',
  readTime: '',
  tagsInput: '',
  status: 'draft',
  sections: [{ heading: '', text: '' }],
};

function toEditor(post: BlogPost): EditorState {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    image: post.image,
    imageAlt: post.imageAlt,
    date: post.date,
    readTime: post.readTime,
    tagsInput: post.tags.join('، '),
    status: post.status,
    sections: post.body.length > 0 ? post.body.map((s) => ({ ...s })) : [{ heading: '', text: '' }],
  };
}

/**
 * Blog CMS for admins and authors: list (with drafts), create/edit form
 * with a section-based body editor, and hard delete.
 */
export const BlogManagerPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  usePageMeta(
    'مدیریت وبلاگ',
    'نوشتن، ویرایش و انتشار مطالب وبلاگ پولاریس استایل.',
    '/controlpanel/blog'
  );

  const load = useCallback(() => {
    setError(null);
    setPosts(null);
    blogApi
      .list()
      .then(setPosts)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // --- Editor helpers -------------------------------------------------------

  const patchEditor = (patch: Partial<EditorState>) =>
    setEditor((e) => (e ? { ...e, ...patch } : e));

  const patchSection = (index: number, patch: Partial<BlogSection>) =>
    setEditor((e) => {
      if (!e) return e;
      const sections = e.sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...e, sections };
    });

  const validate = (e: EditorState): string | null => {
    if (e.title.trim().length < 3) return 'عنوان مطلب را وارد کنید';
    if (!SLUG_REGEX.test(e.slug)) return 'آدرس (slug) فقط با حروف کوچک انگلیسی، عدد و خط تیره مجاز است';
    if (posts?.some((p) => p.slug === e.slug && p.id !== e.id)) return 'این آدرس قبلاً برای مطلب دیگری ثبت شده است';
    if (e.excerpt.trim().length < 10) return 'خلاصه مطلب را وارد کنید (حداقل ۱۰ حرف)';
    if (!e.sections.some((s) => s.text.trim())) return 'متن مطلب نمی‌تواند خالی باشد';
    return null;
  };

  const handleSave = async () => {
    if (!editor || saving) return;
    const validationError = validate(editor);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const payload = {
      slug: editor.slug,
      title: editor.title.trim(),
      excerpt: editor.excerpt.trim(),
      image: editor.image.trim() || undefined,
      imageAlt: editor.imageAlt.trim() || undefined,
      date: editor.date.trim() || undefined,
      readTime: editor.readTime.trim() || undefined,
      tags: editor.tagsInput
        .split(/[,،]/)
        .map((t) => t.trim())
        .filter(Boolean),
      body: editor.sections
        .map((s) => ({ heading: s.heading?.trim() || undefined, text: s.text.trim() }))
        .filter((s) => s.text),
      status: editor.status,
    };
    setSaving(true);
    try {
      if (editor.id) {
        await blogApi.update(editor.id, payload);
        toast.success('مطلب با موفقیت به‌روزرسانی شد');
      } else {
        await blogApi.create(payload);
        toast.success('مطلب جدید ثبت شد');
      }
      setEditor(null);
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'ذخیره مطلب ناموفق بود'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await blogApi.remove(id);
      toast.success('مطلب حذف شد');
      setPosts((p) => (p ? p.filter((post) => post.id !== id) : p));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'حذف مطلب ناموفق بود'));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // --- Editor view ------------------------------------------------------------

  if (editor) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setEditor(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            بازگشت به فهرست مطالب
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => patchEditor({ status: editor.status === 'published' ? 'draft' : 'published' })}
            >
              {editor.status === 'published' ? 'تبدیل به پیش‌نویس' : 'انتشار مطلب'}
            </Button>
            <Button
              size="sm"
              loading={saving}
              onClick={() => void handleSave()}
              className="bg-[#CEAE80] hover:bg-[#c2a06e] text-black font-black"
            >
              ذخیره مطلب
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="blog-title">عنوان مطلب</FieldLabel>
              <Input
                id="blog-title"
                value={editor.title}
                onChange={(e) => patchEditor({ title: e.target.value })}
                placeholder="مثال: راهنمای انتخاب پارچه مانتو"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="blog-slug">آدرس (slug)</FieldLabel>
              <Input
                id="blog-slug"
                value={editor.slug}
                onChange={(e) => patchEditor({ slug: e.target.value.trim().toLowerCase() })}
                placeholder="fabric-guide"
                dir="ltr"
                className="font-mono text-left"
              />
              <FieldDescription>فقط حروف کوچک انگلیسی، عدد و خط تیره؛ در آدرس صفحه استفاده می‌شود.</FieldDescription>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="blog-excerpt">خلاصه مطلب</FieldLabel>
            <Textarea
              id="blog-excerpt"
              value={editor.excerpt}
              onChange={(e) => patchEditor({ excerpt: e.target.value })}
              rows={2}
              placeholder="یک یا دو جمله که در فهرست وبلاگ نمایش داده می‌شود…"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="blog-image">آدرس تصویر شاخص</FieldLabel>
              <Input
                id="blog-image"
                value={editor.image}
                onChange={(e) => patchEditor({ image: e.target.value })}
                placeholder="/uploads/blog/cover.jpg یا https://…"
                dir="ltr"
                className="text-left"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="blog-image-alt">متن جایگزین تصویر</FieldLabel>
              <Input
                id="blog-image-alt"
                value={editor.imageAlt}
                onChange={(e) => patchEditor({ imageAlt: e.target.value })}
                placeholder="توضیح تصویر برای دسترسی‌پذیری و سئو"
              />
            </Field>
          </div>

          {editor.image.trim() && (
            <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-white/10 max-w-sm">
              <SafeImage src={editor.image.trim()} alt={editor.imageAlt} className="w-full aspect-video object-cover" />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="blog-date">تاریخ نمایشی</FieldLabel>
              <Input
                id="blog-date"
                value={editor.date}
                onChange={(e) => patchEditor({ date: e.target.value })}
                placeholder="۱۴۰۵/۰۶/۰۳"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="blog-read-time">زمان مطالعه</FieldLabel>
              <Input
                id="blog-read-time"
                value={editor.readTime}
                onChange={(e) => patchEditor({ readTime: e.target.value })}
                placeholder="۵ دقیقه"
              />
            </Field>

            <Field className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="blog-tags">برچسب‌ها</FieldLabel>
              <Input
                id="blog-tags"
                value={editor.tagsInput}
                onChange={(e) => patchEditor({ tagsInput: e.target.value })}
                placeholder="پارچه، مانتو، راهنما"
              />
              <FieldDescription>با ویرگول جدا کنید.</FieldDescription>
            </Field>
          </div>
        </div>

        {/* Body sections */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 dark:text-white">بدنه مطلب</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setEditor((e) => (e ? { ...e, sections: [...e.sections, { heading: '', text: '' }] } : e))
              }
            >
              <Plus />
              افزودن بخش
            </Button>
          </div>

          {editor.sections.map((section, index) => (
            <div
              key={index}
              className="rounded-2xl border border-stone-200 dark:border-white/10 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-stone-400 dark:text-stone-500">
                  بخش {index + 1}
                </span>
                {editor.sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditor((e) =>
                        e ? { ...e, sections: e.sections.filter((_, i) => i !== index) } : e
                      )
                    }
                    className="text-stone-400 hover:text-red-500 transition-colors"
                    aria-label={`حذف بخش ${index + 1}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Input
                value={section.heading ?? ''}
                onChange={(e) => patchSection(index, { heading: e.target.value })}
                placeholder="تیتر بخش (اختیاری)"
                className="font-black"
              />
              <Textarea
                value={section.text}
                onChange={(e) => patchSection(index, { text: e.target.value })}
                rows={4}
                placeholder="متن این بخش…"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditor(null)}>انصراف</Button>
          <Button
            loading={saving}
            onClick={() => void handleSave()}
            className="bg-[#CEAE80] hover:bg-[#c2a06e] text-black font-black"
          >
            ذخیره مطلب
          </Button>
        </div>
      </div>
    );
  }

  // --- List view --------------------------------------------------------------

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
            مدیریت وبلاگ
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            مطالب منتشرشده در صفحه وبلاگ سایت نمایش داده می‌شوند؛ پیش‌نویس‌ها فقط اینجا قابل مشاهده‌اند.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={!posts && !error}>
            <RefreshCw />
            به‌روزرسانی
          </Button>
          <Button
            size="sm"
            onClick={() => setEditor({ ...EMPTY_EDITOR, sections: [{ heading: '', text: '' }] })}
            className="bg-[#CEAE80] hover:bg-[#c2a06e] text-black font-black"
          >
            <Plus />
            نوشته جدید
          </Button>
        </div>
      </div>

      {error && (
        <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
          <EmptyMedia variant="icon">
            <RefreshCw />
          </EmptyMedia>
          <EmptyTitle>خطا در بارگذاری مطالب</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
          <EmptyContent>
            <Button variant="outline" onClick={load}>تلاش دوباره</Button>
          </EmptyContent>
        </Empty>
      )}

      {!posts && !error && (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      )}

      {posts && posts.length === 0 && (
        <Empty className="border border-dashed border-stone-200 dark:border-white/10 rounded-3xl p-10">
          <EmptyMedia variant="icon">
            <Newspaper />
          </EmptyMedia>
          <EmptyTitle>هنوز مطلبی نوشته نشده</EmptyTitle>
          <EmptyDescription>اولین مطلب وبلاگ پولاریس را بنویسید.</EmptyDescription>
          <EmptyContent>
            <Button onClick={() => setEditor({ ...EMPTY_EDITOR })}>
              <Plus />
              نوشته جدید
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {posts && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] p-4 flex gap-4"
            >
              <span className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-100 dark:bg-white/5 hidden sm:block">
                <SafeImage src={post.image} alt={post.imageAlt} className="w-full h-full object-cover" />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-stone-900 dark:text-white truncate">
                    {post.title}
                  </h3>
                  <Badge
                    className={cn(
                      'text-[10px]',
                      post.status === 'published'
                        ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-transparent'
                        : 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-transparent'
                    )}
                  >
                    {post.status === 'published' ? 'منتشر شده' : 'پیش‌نویس'}
                  </Badge>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-5">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-400 dark:text-stone-500 flex-wrap">
                  <span className="font-mono" dir="ltr">/{post.slug}</span>
                  {post.date && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {post.date}
                    </span>
                  )}
                  <span>نویسنده: {post.authorName}</span>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  {post.status === 'published' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-stone-500 hover:text-[#A67C38] dark:hover:text-[#CEAE80]"
                      render={<Link to={`/blog/${post.slug}`} target="_blank" />}
                      aria-label="مشاهده مطلب"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-stone-500 hover:text-[#A67C38] dark:hover:text-[#CEAE80]"
                    onClick={() => setEditor(toEditor(post))}
                    aria-label="ویرایش مطلب"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>

                {confirmDeleteId === post.id ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="destructive"
                      size="sm"
                      loading={deletingId === post.id}
                      onClick={() => void handleDelete(post.id)}
                    >
                      حذف قطعی
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                      انصراف
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-stone-400 hover:text-red-500"
                    onClick={() => setConfirmDeleteId(post.id)}
                    aria-label="حذف مطلب"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogManagerPage;
