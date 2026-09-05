import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, ShoppingBag } from 'lucide-react';
import type { BlogPostDisplay } from '@/types';
import { BLOG_POSTS } from '@/data/blogPosts';
import { publicApi } from '@/lib/api';
import { usePageMeta } from '@/lib/usePageMeta';
import { Reveal } from '@/components/public/Reveal';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Static articles render instantly; the blog API replaces the list when it
  // responds. `resolved` tracks the fetch so API-only slugs are not bounced
  // to /blog before the live list arrives.
  const [posts, setPosts] = useState<BlogPostDisplay[]>(BLOG_POSTS);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    publicApi.blog
      .list()
      .then((live) => {
        if (cancelled) return;
        if (live.length > 0) setPosts(live);
      })
      .catch(() => {
        /* keep the static fallback */
      })
      .finally(() => {
        if (!cancelled) setResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const post = posts.find((p) => p.slug === slug);
  const postIndex = post ? posts.indexOf(post) : -1;
  const newer = postIndex > 0 ? posts[postIndex - 1] : undefined;
  const older = postIndex >= 0 && postIndex < posts.length - 1 ? posts[postIndex + 1] : undefined;

  usePageMeta(
    post?.title ?? 'مطلب یافت نشد',
    post?.excerpt ?? 'مجله استایل و راهنمای پوشاک پولاریس استایل.',
    post ? `/blog/${post.slug}` : '/blog'
  );

  // Article structured data for search engines (rendered only for real posts).
  useEffect(() => {
    if (!post) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      image: `https://polarisstyle.ir${new URL(post.image, 'https://polarisstyle.ir').pathname}`,
      inLanguage: 'fa',
      author: { '@type': 'Organization', name: 'پولاریس استایل' },
      publisher: { '@type': 'Organization', name: 'پولاریس استایل' },
      mainEntityOfPage: `https://polarisstyle.ir/blog/${post.slug}`,
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [post]);

  if (!post) {
    if (resolved) return <Navigate to="/blog" replace />;
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-sm font-bold text-stone-400">
        در حال بارگذاری مطلب...
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Breadcrumb / back */}
      <Reveal>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-black text-stone-500 dark:text-stone-400 hover:text-brand-ink transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          بازگشت به وبلاگ
        </Link>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full border border-brand/40 bg-brand/10 text-brand-ink text-[10px] font-black"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="mt-4 text-xl sm:text-3xl font-black leading-9 sm:leading-[1.6] text-stone-900 dark:text-white">
          {post.title}
        </h1>
        <div className="mt-4 flex items-center gap-5 text-[11px] font-bold text-stone-500 dark:text-stone-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-brand-ink" />
            {post.date}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="w-3.5 h-3.5 text-brand-ink" />
            {post.readTime}
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mt-7 rounded-3xl overflow-hidden border border-brand/25 shadow-lg">
          <img src={post.image} alt={post.imageAlt} className="w-full h-56 sm:h-80 object-cover" />
        </div>
      </Reveal>

      {/* Body */}
      <div className="mt-8 space-y-6">
        {post.body.map((section, i) => (
          <Reveal key={i} delay={0.05}>
            {section.heading && (
              <h2 className="mb-2 text-base sm:text-lg font-black text-stone-900 dark:text-white">
                {section.heading}
              </h2>
            )}
            <p className="text-sm sm:text-base leading-8 sm:leading-9 text-stone-700 dark:text-stone-300">
              {section.text}
            </p>
          </Reveal>
        ))}
      </div>

      {/* Shop CTA */}
      <Reveal className="mt-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-brand/30 bg-gradient-to-bl from-brand/15 to-transparent">
          <p className="text-sm font-black text-stone-900 dark:text-white text-center sm:text-right">
            تکه‌های پایه این استایل را در فروشگاه پولاریس ببینید.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-2xl bg-brand hover:bg-brand-hover text-brand-on text-xs font-black shadow-md shadow-brand/25 transition-all active:scale-95 shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            خرید از فروشگاه
          </Link>
        </div>
      </Reveal>

      {/* Prev / next */}
      <nav className="mt-8 grid sm:grid-cols-2 gap-4" aria-label="سایر مطالب">
        {newer && (
          <Link
            to={`/blog/${newer.slug}`}
            className="group p-4 sm:p-5 rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] hover:border-brand/45 transition-colors"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-stone-500 dark:text-stone-400">
              <ArrowRight className="w-3.5 h-3.5" />
              مطلب جدیدتر
            </span>
            <span className="block mt-2 text-xs sm:text-sm font-black leading-6 text-stone-900 dark:text-white group-hover:text-brand-ink dark:group-hover:text-brand transition-colors line-clamp-2">
              {newer.title}
            </span>
          </Link>
        )}
        {older && (
          <Link
            to={`/blog/${older.slug}`}
            className="group p-4 sm:p-5 rounded-3xl border border-stone-200/80 dark:border-white/8 bg-white dark:bg-[#16161a] hover:border-brand/45 transition-colors sm:text-left"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-stone-500 dark:text-stone-400">
              مطلب قدیمی‌تر
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
            <span className="block mt-2 text-xs sm:text-sm font-black leading-6 text-stone-900 dark:text-white group-hover:text-brand-ink dark:group-hover:text-brand transition-colors line-clamp-2">
              {older.title}
            </span>
          </Link>
        )}
      </nav>
    </article>
  );
};

export default BlogPostPage;
