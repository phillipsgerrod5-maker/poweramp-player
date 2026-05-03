import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { PlayerPage } from "./components/PlayerPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

interface EBState {
  hasError: boolean;
  message: string;
}
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error.message ?? "Unknown error" };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PowerAmp] Error:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#000814",
            color: "#00d5ff",
            fontFamily: "monospace",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36 }}>⚡</div>
          <div style={{ fontSize: 14 }}>PowerAmp Player — Engine Error</div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              maxWidth: 300,
            }}
          >
            {this.state.message}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: "10px 24px",
              background: "rgba(0,213,255,0.1)",
              border: "1px solid rgba(0,213,255,0.4)",
              borderRadius: 8,
              color: "#00d5ff",
              fontFamily: "monospace",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Tap to Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="h-full dark">
          <PlayerPage />
        </div>
        <Toaster position="top-center" theme="dark" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
