import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveSession } from '../config/tenants.js';
import { supabase } from '../lib/supabase.js';

const T = { syne: 'Syne, sans-serif', dm: '"DM Sans", sans-serif' };


// ─── Login ────────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Autenticar con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email:    form.email.toLowerCase().trim(),
        password: form.password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // 2. Obtener tenant desde profiles (join con tenants)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, tenants(key)')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile?.tenants?.key) {
        setError('No se encontró el tenant del usuario');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 3. Guardar sesión multi-tenant en sessionStorage (igual que antes)
      saveSession(form.email, profile.tenants.key);
      navigate('/dashboard');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#F4F4F8' }}>

      {/* ── Panel izquierdo — genérico Veridoc ── */}
      <div style={{
        width: 420, flexShrink: 0, backgroundColor: '#1E3A2F',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 40px', gap: 16,
      }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 38, color: '#fff', letterSpacing: -0.5 }}>
            Verido
          </span>
          <span style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 38, color: '#4CAF8A', letterSpacing: -0.5 }}>
            c
          </span>
          <span style={{ fontFamily: T.dm, fontWeight: 300, fontSize: 17, color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>
            IA
          </span>
        </div>

        {/* Tagline */}
        <p style={{
          fontFamily: T.dm, fontWeight: 300, fontSize: 13,
          color: 'rgba(255,255,255,0.32)', margin: 0,
          textAlign: 'center', letterSpacing: 0.2, lineHeight: 1.5,
        }}>
          Automatización inteligente de documentos
        </p>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>

          <h1 style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 24, color: '#1E3A2F', margin: '0 0 4px' }}>
            Inicia sesión
          </h1>
          <p style={{ fontFamily: T.dm, fontWeight: 300, fontSize: 13, color: '#9CA3AF', margin: '0 0 28px' }}>
            Accede a tu espacio de trabajo
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Email"      type="email"    value={form.email}    onChange={set('email')}    placeholder="tu@empresa.com" />
            <Field label="Contraseña" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />

            {error && (
              <p style={{ fontFamily: T.dm, fontSize: 13, color: '#C62828', background: '#FFF1F1', border: '1px solid #FFCDD2', borderRadius: 10, padding: '10px 14px', margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                fontFamily: T.dm, fontWeight: 500, fontSize: 14,
                color: '#fff', backgroundColor: '#1E3A2F',
                border: 'none', borderRadius: 12,
                padding: '13px', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4, transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2a5040'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E3A2F'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Verificando…
                </>
              ) : 'Ingresar'}
            </button>
          </form>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── TenantLogo — exportado para uso en Dashboard y otros componentes ─────────
export function TenantLogo({ tenant, size = 40 }) {
  if (tenant?.logo) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.92)', borderRadius: 8,
        padding: '6px 10px', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        height: 36, flexShrink: 0,
      }}>
        <img
          src={tenant.logo}
          alt={tenant.nombre}
          style={{ maxHeight: 24, maxWidth: 90, objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: 'rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 600, fontSize: Math.round(size * 0.35),
      fontFamily: T.syne,
    }}>
      {tenant?.iniciales}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, type, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 12, color: '#6B7280' }}>
        {label}
      </label>
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          fontFamily: T.dm, fontSize: 13, color: '#1E3A2F',
          backgroundColor: '#fff',
          border: `1px solid ${focused ? '#4CAF8A' : '#E8E8F0'}`,
          borderRadius: 10, padding: '11px 14px',
          outline: 'none', width: '100%', boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      />
    </div>
  );
}
