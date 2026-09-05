import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock3, PenLine } from 'lucide-react';
import type { BlogPostDisplay } from '@/types';
import { BLOG_POSTS } from '@/data/blogPosts';
import { publicApi } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { Reveal } from '@/components/public/Reveal';
import { SectionHeading } from '@/components/public/SectionHeading';

export const BlogPage: React.FC = () => {
  usePageMeta(
    'وبلاگ و مجله استایل پولاریس',
    'مقالات استایل، راهنمای خرید پوشاک و نکات نگهداری لباس؛ از مجله پولاریس استایل.',
    '/blog'
  );

  // Static articles render instantly; the blog API replaces them when it
  // responds, and stays the fallback when it fails.
  const [posts, setPosts] = useState<BlogPostDisplay[]>(BLOG_POSTS);

  useEffect(() => {
    let cancelled = false;
    publicApi.blog
      .list()
      .then((live) => {
        if (!cancelled && live.length > 0) setPosts(live);
      })
      .catch(() => {
        /* keep the static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <SectionHeading
        eyebrow="وبلاگ پولاریس"
        title="مجله استایل و راهنمای پوشاک"
        subtitle="راهنمای خرید، نکات نگهداری لباس و ایده‌های ست‌کردن؛ کوتاه، کاربردی و به‌زبان ساده."
      />

      <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 max-w-5xl mx-auto">
        {posts.map((post, i) => (
          <Reveal key={post.slug} delay={i * 0.08}>
            <Link
              to={`/blog/${post.slug}`}
              className="group flex flex-col h-full rounded-3xl overflow-hidden bg-white dark:bg-[#16161a] border border-stone-200/80 dark:border-white/8 shadow-sm hover:shadow-xl hover:shadow-brand/10 hover:border-brand/45 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative h-48 sm:h-52 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.imageAlt}
                  loading={i < 2 ? undefined : 'lazy'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-black"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col flex-1 p-5 sm:p-6">
                <div className="flex items-center gap-4 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-brand-ink" />
                    {post.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5 text-brand-ink" />
                    {post.readTime}
                  </span>
                </div>

                <h2 className="mt-3 text-base sm:text-lg font-black leading-7 sm:leading-8 text-stone-900 dark:text-white group-hover:text-brand-ink dark:group-hover:text-brand transition-colors">
                  {post.title}
                </h2>
                <p className="mt-2 text-xs sm:text-sm leading-6 sm:leading-7 text-stone-600 dark:text-stone-400 line-clamp-3">
                  {post.excerpt}
                </p>

                <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs font-black text-brand-ink group-hover:gap-3 transition-all">
                  خواندن مطلب
                  <ArrowLeft className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-12 text-center" delay={0.15}>
        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-3xl border border-brand/25 bg-gradient-to-bl from-brand/12 to-transparent">
          <PenLine className="w-5 h-5 text-brand-ink shrink-0" />
          <p className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
            مطلب جدیدی در راه است؛ برای دیدن مدل‌های تازه، سر زدن به{' '}
            <Link to="/shop" className="text-brand-ink font-black hover:underline">
              فروشگاه
            </Link>{' '}
            را فراموش نکنید.
          </p>
        </div>
      </Reveal>
    </div>
  );
};

export default BlogPage;
