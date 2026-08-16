import { Route, Routes } from "react-router-dom";
import Nav from "./components/Nav";
import ArchitecturePage from "./pages/ArchitecturePage";
import JobDetailPage from "./pages/JobDetailPage";
import JobsPage from "./pages/JobsPage";
import ReviewQueuePage from "./pages/ReviewQueuePage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/review" element={<ReviewQueuePage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
        </Routes>
      </main>
    </div>
  );
}
