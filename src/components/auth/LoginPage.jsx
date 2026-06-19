import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './auth.css';

export const LoginPage = () => {
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const btnRef = useRef(null);
  const gisInitialized = useRef(false);

  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
      return;
    }

    const initGis = () => {
      if (gisInitialized.current || !window.google || !btnRef.current) return;
      gisInitialized.current = true;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await loginWithGoogle(response.credential);
            navigate(redirectTo, { replace: true });
          } catch (err) {
            if (err.message === 'no_autorizado') {
              toast.error('Usuario no autorizado. Contacte al administrador.');
            } else {
              toast.error('Error al iniciar sesión. Intente nuevamente.');
            }
          }
        },
        auto_select: false,
      });

      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        locale: 'es',
        width: 300,
      });
    };

    if (window.google) {
      initGis();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener('load', initGis);
        return () => script.removeEventListener('load', initGis);
      }
    }
  }, [isAuthenticated, loginWithGoogle, navigate, redirectTo, toast]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 56, height: 56, fontSize: 26 }}>P</div>
          <h1>Panacea Mayorista</h1>
        </div>

        <h2 className="auth-title">Iniciar sesión</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
          Acceso restringido a usuarios autorizados
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div ref={btnRef} />
        </div>
      </div>
    </div>
  );
};
