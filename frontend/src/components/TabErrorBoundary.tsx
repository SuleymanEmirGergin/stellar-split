import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { i18n } from '../lib/i18n';

interface Props {
  /** Tab identifier — used as the React key so a tab change resets the boundary. */
  tabKey: string;
  /** Human-readable tab label, shown inside the fallback. */
  tabLabel: string;
  /** When true, the fallback shows a small reset button in addition to the message. */
  allowRetry?: boolean;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

/**
 * Per-tab error boundary used inside GroupDetail. The full-page ErrorBoundary
 * was previously catching tab-render exceptions (e.g. AKTİVİTE / AuditTab when
 * the backend returns 404 from a partial deploy) and replacing the entire app
 * surface with the generic "Something went wrong" panel.
 *
 * With this wrapper, a single failing tab is isolated:
 *   - the rest of the GroupDetail UI (sidebar, header, sibling tabs) keeps
 *     rendering;
 *   - the affected tab shows a compact "tab failed to load" notice with a
 *     retry button;
 *   - switching to another tab automatically resets the boundary because the
 *     `tabKey` prop changes — React unmounts the previous instance.
 *
 * Errors logged here are forwarded to the console with a [TabErrorBoundary]
 * prefix so the panel parent (App-level ErrorBoundary) can stay clean.
 */
export default class TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMsg: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: String(error?.message ?? 'unknown error') };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[TabErrorBoundary] tab="${this.props.tabKey}" caught:`,
      error,
      info.componentStack,
    );
  }

  /**
   * Reset state so the children re-render. The user clicks "Retry" — typically
   * after the backend recovers or they just want to try again.
   */
  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMsg: '' });
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center bg-rose-500/[0.04] border border-rose-500/15 rounded-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
          <AlertCircle size={22} className="text-rose-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">
            {i18n.t('tab.error_title').replace('{{tab}}', this.props.tabLabel)}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {i18n.t('tab.error_desc')}
          </p>
        </div>
        {(this.props.allowRetry ?? true) && (
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-bold text-foreground transition-colors"
          >
            <RefreshCw size={12} />
            {i18n.t('tab.error_retry')}
          </button>
        )}
      </div>
    );
  }
}
