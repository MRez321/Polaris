import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-8 bg-stone-900 border border-rose-500/30 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-white">
            {this.props.fallbackTitle || 'خطایی در بارگذاری این بخش رخ داده است'}
          </h2>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            {this.state.error?.message || 'مشکل غیرمنتظره‌ای به وجود آمد.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all"
            >
              تلاش مجدد
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-on text-xs font-black flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بارگذاری مجدد صفحه</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
