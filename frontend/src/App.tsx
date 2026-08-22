import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import LoginModal from './components/LoginModal';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar'; // We can keep this if you want it on all protected pages

function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main>{children}</main>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <LoginModal />
                <Routes>
                    <Route path="/" element={<Landing />} />
<Route path="/login" element={<AuthModal />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/*" element={
                            <AppLayout>
                                <Routes>
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/admin" element={<div>Admin Panel</div>} />
                                </Routes>
                            </AppLayout>
                        } />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;