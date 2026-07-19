import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { LibraryPage } from "./pages/LibraryPage";
import {
  DawsPage,
  FavoritesPage,
  FoldersPage,
  RecentProjectsPage,
  ScanHistoryPage,
  SettingsPage,
  StatusesPage,
} from "./pages/PlaceholderPages";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/recent" element={<RecentProjectsPage />} />
        <Route path="/daws" element={<DawsPage />} />
        <Route path="/statuses" element={<StatusesPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/scan-history" element={<ScanHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  );
}
