import { useSession } from '../lib/auth-client';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}