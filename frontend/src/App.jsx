import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getSession, clearSession } from './config/tenants.js';
import { supabase } from './lib/supabase.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import InvoiceReview from './pages/InvoiceReview.jsx';
import InvoiceUpload from './pages/InvoiceUpload.jsx';
import AlbaranesPage from './pages/AlbaranesPage.jsx';

function PrivateRoute({ children }) {
  const [ready, setReady]   = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true);
      } else {
        clearSession();
      }
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"            element={<Login />} />
        <Route path="/"                 element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/invoices"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/invoices/upload"  element={<PrivateRoute><InvoiceUpload /></PrivateRoute>} />
        <Route path="/review/:id"       element={<PrivateRoute><InvoiceReview /></PrivateRoute>} />
        <Route path="/albaranes"        element={<PrivateRoute><AlbaranesPage /></PrivateRoute>} />
        <Route path="*"                 element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
