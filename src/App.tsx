import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import AuthPage from "./pages/Auth";
import CreateReport from "./pages/CreateReport";
import MyReports from "./pages/MyReports";
import ReportDetail from "./pages/ReportDetail";
import MapView from "./pages/MapView";
import MessagesPage from "./pages/Messages";
import Admin from "./pages/Admin";
import ProfilePage from "./pages/Profile";
import Banned from "./pages/Banned";
import Leaderboard from "./pages/Leaderboard";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

const BanGate = ({ children }: { children: JSX.Element }) => {
  const { isBanned, loading } = useAuth();
  if (loading) return children;
  if (isBanned) return <Banned />;
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BanGate><Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/reports/:id" element={<ReportDetail />} />
              <Route path="/create" element={<ProtectedRoute><CreateReport /></ProtectedRoute>} />
              <Route path="/edit/:id" element={<ProtectedRoute><CreateReport /></ProtectedRoute>} />
              <Route path="/my-reports" element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/:name" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes></BanGate>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
