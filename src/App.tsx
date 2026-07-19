import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { LibraryPage } from "./pages/LibraryPage";

const FoldersPage = lazy(() => import("./pages/FoldersPage").then((module) => ({ default: module.FoldersPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage").then((module) => ({ default: module.ProjectDetailPage })));
const ProjectEditorPage = lazy(() => import("./pages/ProjectEditorPage").then((module) => ({ default: module.ProjectEditorPage })));
const ProjectFilesPage = lazy(() => import("./pages/ProjectFilesPage").then((module) => ({ default: module.ProjectFilesPage })));
const ScanHistoryPage = lazy(() => import("./pages/ScanHistoryPage").then((module) => ({ default: module.ScanHistoryPage })));

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/favorites" element={<LibraryPage scope="favorites" />} />
        <Route path="/recent" element={<LibraryPage scope="recent" />} />
        <Route path="/daws" element={<LibraryPage scope="daws" />} />
        <Route path="/statuses" element={<LibraryPage scope="statuses" />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/scan-history" element={<ScanHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/edit" element={<ProjectEditorPage />} />
        <Route path="/projects/:projectId/files" element={<ProjectFilesPage />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  );
}
