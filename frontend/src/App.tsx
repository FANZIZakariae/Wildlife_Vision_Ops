import { Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Nav from "./components/Nav";
import { ToastProvider } from "./components/Toast";
import ArchitecturePage from "./pages/ArchitecturePage";
import DashboardPage from "./pages/DashboardPage";
import JobDetailPage from "./pages/JobDetailPage";
import JobsPage from "./pages/JobsPage";
import NotFoundPage from "./pages/NotFoundPage";
import ReviewQueuePage from "./pages/ReviewQueuePage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/review" element={<ReviewQueuePage />} />
              <Route path="/architecture" element={<ArchitecturePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
        <footer className="border-t border-border py-6 text-center text-[11px] text-subtle-foreground">
          Wildlife Vision Ops · model-agnostic inference, human verification and
          audit trail
        </footer>
      </div>
    </ToastProvider>
  );
}
