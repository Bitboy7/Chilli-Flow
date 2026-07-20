import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { LibraryPage } from "./pages/LibraryPage";

const FoldersPage = lazy(() => import("./pages/FoldersPage").then((module) => ({ default: module.FoldersPage })));
const FinishModePage = lazy(() => import("./pages/FinishModePage").then((module) => ({ default: module.FinishModePage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage").then((module) => ({ default: module.ProjectDetailPage })));
const ProjectEditorPage = lazy(() => import("./pages/ProjectEditorPage").then((module) => ({ default: module.ProjectEditorPage })));
const ProjectFilesPage = lazy(() => import("./pages/ProjectFilesPage").then((module) => ({ default: module.ProjectFilesPage })));
const ProjectFinishPage = lazy(() => import("./pages/ProjectFinishPage").then((module) => ({ default: module.ProjectFinishPage })));
const ProjectWorkspacePage = lazy(() => import("./pages/ProjectWorkspacePage").then((module) => ({ default: module.ProjectWorkspacePage })));
const ScanHistoryPage = lazy(() => import("./pages/ScanHistoryPage").then((module) => ({ default: module.ScanHistoryPage })));

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/finish" element={<FinishModePage />} />
        <Route path="/favorites" element={<LibraryPage scope="favorites" />} />
        <Route path="/recent" element={<LibraryPage scope="recent" />} />
        <Route path="/daws" element={<LibraryPage scope="daws" />} />
        <Route path="/statuses" element={<LibraryPage scope="statuses" />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/scan-history" element={<ScanHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspacePage />}>
          <Route index element={<ProjectDetailPage />} />
          <Route path="audio" element={<ProjectFilesPage />} />
          <Route path="finish" element={<ProjectFinishPage />} />
          <Route path="files" element={<Navigate to="../audio" replace />} />
        </Route>
        <Route path="/projects/:projectId/edit" element={<ProjectEditorPage />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  );
}
