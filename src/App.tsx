import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PageLoader from './components/ui/PageLoader';

// Lazy-load all pages except Dashboard for faster initial load
const AddTransaction = React.lazy(() => import('./pages/AddTransaction'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const Loans = React.lazy(() => import('./pages/Loans'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const CalendarView = React.lazy(() => import('./pages/CalendarView'));
const FamilyOverview = React.lazy(() => import('./pages/FamilyOverview'));
const MyProofs = React.lazy(() => import('./pages/MyProofs'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Login = React.lazy(() => import('./pages/Login'));
const Settings = React.lazy(() => import('./pages/Settings'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const Savings = React.lazy(() => import('./pages/Savings'));
const LiveTracking = React.lazy(() => import('./pages/LiveTracking'));
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { LanguageProvider } from './context/LanguageContext';
import { CallProvider } from './context/CallContext';
import { initTheme } from './utils/themeService';
import { usePushNotifications } from './hooks/usePushNotifications';
import { scheduleNotifications, initNotificationListener, initNotificationChannel } from './utils/notificationService';
import { syncBackgroundState } from './utils/trackingService';
import { checkGoldPriceAlert } from './utils/goldNotificationService';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { isAppLockEnabled, verifyAppLock, shouldSuppressLock } from './utils/appLockService';
import { startSmsListener, stopSmsListener, requestSmsPermission, checkSmsPermission, isSmsReaderEnabled } from './utils/smsService';

import ShareActionSheet from './components/ShareActionSheet';
import MaintenanceGuard from './components/MaintenanceGuard';
import { SmsToast } from './components/ui/SmsToast';
import NetworkStatusBar from './components/ui/NetworkStatusBar';

const PushNotificationSetup: React.FC = () => {
  usePushNotifications();
  return null;
};

// Initialize smart notification scheduling + click-to-open listener
const NotificationInit: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    initNotificationChannel(); // Create Android channel with custom sound FIRST
    scheduleNotifications();
    initNotificationListener(navigate);
    initTheme(); // Initialize user's theme preference
  }, [navigate]);
  return null;
};

// Listen to app state changes for background sync
const BackgroundSyncSetup: React.FC = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    
    const listenerPromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        // App is moving to background, sync final state
        syncBackgroundState(user.id);
      }
    });

    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [user]);

  return null;
};

// Gold price change monitor — checks on mount and when app resumes
const GoldPriceMonitor: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Initial check after a short delay (let app settle)
    const initialTimer = setTimeout(() => {
      checkGoldPriceAlert();
    }, 5000);

    let appStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          checkGoldPriceAlert();
        }
      });
    }

    return () => {
      clearTimeout(initialTimer);
      if (appStateListener) {
        appStateListener.then((l: any) => l.remove());
      }
    };
  }, [user]);

  return null;
};

// SMS Listener Setup — starts real-time bank SMS detection
const SmsListenerSetup: React.FC = () => {
  const { user } = useAuth();
  const { addSmsTransaction } = useFinance();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    if (!isSmsReaderEnabled()) return;

    let mounted = true;

    const initSmsListener = async () => {
      const perm = await checkSmsPermission();
      if (!perm.granted) return;

      await startSmsListener((parsedSms) => {
        if (mounted && parsedSms) {
          addSmsTransaction(parsedSms);
        }
      });
    };

    // Delay to let the app settle
    const timer = setTimeout(initSmsListener, 5000);

    return () => {
      mounted = false;
      clearTimeout(timer);
      stopSmsListener();
    };
  }, [user, addSmsTransaction]);

  return null;
};

// Android hardware back button handler
const BackButtonHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // If on home/dashboard, exit the app
      if (location.pathname === '/' || location.pathname === '') {
        CapacitorApp.exitApp();
      } else {
        // Pop history stack if possible, else return to dashboard safely
        if (canGoBack || window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/', { replace: true });
        }
      }
    });

    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [navigate, location.pathname]);

  return null;
};

interface AppLockGuardProps {
  children: React.ReactNode;
}

// App Lock Guard — shows lock screen when app lock is enabled
const AppLockGuard: React.FC<AppLockGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check on initial mount
  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) {
      setChecking(false);
      return;
    }

    if (!isAppLockEnabled()) {
      setChecking(false);
      return;
    }

    setLocked(true);
    setChecking(false);

    // Trigger authentication
    verifyAppLock().then(result => {
      if (result.success) {
        setLocked(false);
      }
    });
  }, [user]);

  // Listen for app resume from background
  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        if (!isAppLockEnabled()) return;

        // Skip lock if we're returning from a file picker / camera
        if (shouldSuppressLock()) return;

        setLocked(true);
        const result = await verifyAppLock();
        if (result.success) {
          setLocked(false);
        }
      }
    });

    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [user]);

  const handleUnlock = async () => {
    const result = await verifyAppLock();
    if (result.success) {
      setLocked(false);
    }
  };

  if (checking) {
    return (
      <div className="h-full min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="h-full min-h-screen flex flex-col items-center justify-center bg-[#000000] p-6">
        <div className="text-center space-y-6">
          {/* Lock icon with glow */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 backdrop-blur-xl border border-primary-500/30 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(124,58,237,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-400">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">MS Family</h2>
            <p className="text-sm text-slate-400">App is locked</p>
          </div>

          <button
            onClick={handleUnlock}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-bold text-base shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all active:scale-95"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Request all critical permissions immediately after login
const PermissionRequestor: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    const requestAllPermissions = async () => {
      // 1. Notification permission (Android 13+)
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const notifStatus = await LocalNotifications.checkPermissions();
        if (notifStatus.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      } catch (e) {
        console.warn('Notification permission request failed:', e);
      }

      // 2. Precise location permission
      try {
        const { requestLocationPermissions } = await import('./utils/trackingService');
        await requestLocationPermissions();
      } catch (e) {
        console.warn('Location permission request failed:', e);
      }

      // 3. SMS permission (for Smart SMS Reader)
      try {
        const smsPerm = await checkSmsPermission();
        if (!smsPerm.granted) {
          await requestSmsPermission();
        }
      } catch (e) {
        console.warn('SMS permission request failed:', e);
      }
    };

    // Small delay to let the UI render first
    const timer = setTimeout(requestAllPermissions, 1500);
    return () => clearTimeout(timer);
  }, [user]);

  return null;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.name === 'ArulPrakash';
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const SmsToastContainer: React.FC = () => {
  const { activeSmsToast, setActiveSmsToast } = useFinance();
  return (
    <SmsToast 
      toast={activeSmsToast} 
      onClose={() => setActiveSmsToast(null)} 
    />
  );
};

const NetworkStatusSetup: React.FC = () => {
  const { refetch } = useFinance();
  return <NetworkStatusBar onReconnect={refetch} />;
};

function App() {
  const [deferServices, setDeferServices] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDeferServices(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <CallProvider>
        <FinanceProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <PushNotificationSetup />
            <NotificationInit />
            {deferServices && (
              <>
                <BackgroundSyncSetup />
                <PermissionRequestor />
                <GoldPriceMonitor />
                <SmsListenerSetup />
              </>
            )}
            <BackButtonHandler />
            <ShareActionSheet />
            <SmsToastContainer />
            <NetworkStatusSetup />
            <AppLockGuard>
            <MaintenanceGuard>
            <div className="bg-animated-gradient h-full min-h-screen">
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="add" element={<AddTransaction />} />
                  <Route path="loans" element={<Loans />} />
                  <Route path="savings" element={<Savings />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="calendar" element={<CalendarView />} />
                  <Route path="family" element={<FamilyOverview />} />
                  <Route path="proofs" element={<MyProofs />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="admin" element={<AdminRouteGuard><AdminPanel /></AdminRouteGuard>} />
                  <Route path="tracking" element={<LiveTracking />} />
                </Route>
              </Routes>
              </Suspense>
            </div>
            </MaintenanceGuard>
            </AppLockGuard>
          </Router>
        </FinanceProvider>
        </CallProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
