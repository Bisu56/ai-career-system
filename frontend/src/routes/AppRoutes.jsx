import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import ResumeUpload from "../pages/ResumeUpload";
import History from "../pages/History";
import Jobs from "../pages/Jobs";
import JobDetail from "../pages/JobDetail";
import Applications from "../pages/Applications";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "./ProtectedRoute";
import AdminProtectedRoute from "./AdminProtectedRoute";
import EmployerProtectedRoute from "./EmployerProtectedRoute";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminEmployers from "../pages/admin/AdminEmployers";
import AdminJobs from "../pages/admin/AdminJobs";
import AdminFeed from "../pages/admin/AdminFeed";

// Employer pages
import EmployerDashboard from "../pages/employer/EmployerDashboard";
import CompanyProfile from "../pages/employer/CompanyProfile";
import PostJob from "../pages/employer/PostJob";
import EmployerJobs from "../pages/employer/EmployerJobs";
import EmployerApplicants from "../pages/employer/EmployerApplicants";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={<MainLayout><Home /></MainLayout>}
        />
        <Route
          path="/login"
          element={<MainLayout><Login /></MainLayout>}
        />
        <Route
          path="/register"
          element={<MainLayout><Register /></MainLayout>}
        />

        {/* Job seeker protected routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/upload"
          element={<ProtectedRoute><ResumeUpload /></ProtectedRoute>}
        />
        <Route
          path="/history"
          element={<ProtectedRoute><History /></ProtectedRoute>}
        />
        <Route
          path="/jobs"
          element={<ProtectedRoute><Jobs /></ProtectedRoute>}
        />
        <Route
          path="/jobs/:id"
          element={<ProtectedRoute><JobDetail /></ProtectedRoute>}
        />
        <Route
          path="/applications"
          element={<ProtectedRoute><Applications /></ProtectedRoute>}
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>}
        />
        <Route
          path="/admin/users"
          element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>}
        />
        <Route
          path="/admin/employers"
          element={<AdminProtectedRoute><AdminEmployers /></AdminProtectedRoute>}
        />
        <Route
          path="/admin/jobs"
          element={<AdminProtectedRoute><AdminJobs /></AdminProtectedRoute>}
        />
        <Route
          path="/admin/feed"
          element={<AdminProtectedRoute><AdminFeed /></AdminProtectedRoute>}
        />

        {/* Employer routes */}
        <Route
          path="/employer/dashboard"
          element={<EmployerProtectedRoute><EmployerDashboard /></EmployerProtectedRoute>}
        />
        <Route
          path="/employer/profile"
          element={<EmployerProtectedRoute><CompanyProfile /></EmployerProtectedRoute>}
        />
        <Route
          path="/employer/jobs"
          element={<EmployerProtectedRoute><EmployerJobs /></EmployerProtectedRoute>}
        />
        {/* "new" before :id so it isn't treated as an id param */}
        <Route
          path="/employer/jobs/new"
          element={<EmployerProtectedRoute><PostJob key="new" /></EmployerProtectedRoute>}
        />
        <Route
          path="/employer/jobs/:id/edit"
          element={<EmployerProtectedRoute><PostJob key="edit" /></EmployerProtectedRoute>}
        />
        <Route
          path="/employer/jobs/:jobId/applicants"
          element={<EmployerProtectedRoute><EmployerApplicants /></EmployerProtectedRoute>}
        />
        <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
