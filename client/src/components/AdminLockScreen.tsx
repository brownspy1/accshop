import { useState, useEffect, useRef, FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { startAuthentication } from "@simplewebauthn/browser";
import { toast } from "sonner";
import { 
  Fingerprint, 
  KeyRound, 
  Lock, 
  LoaderCircle, 
  LogOut, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldAlert
} from "lucide-react";

interface AdminLockScreenProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  children: React.ReactNode;
}

export const ADMIN_LOCK_EVENT = "admin:lock-screen";

export function triggerAdminLock() {
  sessionStorage.removeItem("admin_screen_unlocked");
  window.dispatchEvent(new CustomEvent(ADMIN_LOCK_EVENT));
}

export function AdminLockScreen({ user, children }: AdminLockScreenProps) {
  // If not explicitly unlocked in this browser session tab, start locked!
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return sessionStorage.getItem("admin_screen_unlocked") !== "true";
  });
  
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const utils = trpc.useUtils();

  const hasPasskeysQuery = trpc.auth.hasPasskeys.useQuery(undefined, { retry: false });
  const passkeyAuthOptions = trpc.auth.passkeyAuthOptions.useMutation();
  const passkeyVerifyAuth = trpc.auth.passkeyVerifyAuth.useMutation();
  const verifyUnlock = trpc.auth.verifyUnlockPassword.useMutation();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      sessionStorage.removeItem("admin_screen_unlocked");
      window.location.href = "/";
    },
  });

  // Handle unlocking
  const handleUnlockSuccess = (method: "passkey" | "password") => {
    sessionStorage.setItem("admin_screen_unlocked", "true");
    setIsLocked(false);
    setPassword("");
    lastActivityRef.current = Date.now();
    if (method === "passkey") {
      toast.success("বায়োমেট্রিক / Touch ID দিয়ে প্যানেল আনলক হয়েছে!");
    } else {
      toast.success("পাসওয়ার্ড দিয়ে সফলভাবে আনলক হয়েছে!");
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      setBiometricLoading(true);
      const options = await passkeyAuthOptions.mutateAsync();
      const authResp = await startAuthentication(options as any);
      await passkeyVerifyAuth.mutateAsync({ response: authResp });
      handleUnlockSuccess("passkey");
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Touch ID / Passkey ভেরিফিকেশন বাতিল করা হয়েছে");
      } else {
        toast.error(err?.message || "বায়োমেট্রিক ভেরিফিকেশন ব্যর্থ হয়েছে");
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handlePasswordUnlock = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      toast.error("পাসওয়ার্ড দিন");
      return;
    }

    try {
      await verifyUnlock.mutateAsync({ password: trimmed });
      handleUnlockSuccess("password");
    } catch (err: any) {
      toast.error(err?.message || "ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।");
    }
  };

  // Listen for manual lock event
  useEffect(() => {
    const handleLockEvent = () => {
      sessionStorage.removeItem("admin_screen_unlocked");
      setIsLocked(true);
      toast.info("অ্যাডমিন স্ক্রিন লক করা হয়েছে");
    };

    window.addEventListener(ADMIN_LOCK_EVENT, handleLockEvent);
    return () => window.removeEventListener(ADMIN_LOCK_EVENT, handleLockEvent);
  }, []);

  // Idle Activity Tracker
  useEffect(() => {
    const getTimeoutMinutes = (): number => {
      const stored = localStorage.getItem("admin_idle_lock_timeout");
      if (stored === null) return 3; // default 3 minutes
      const val = Number(stored);
      return Number.isFinite(val) ? val : 3;
    };

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach(evt => window.addEventListener(evt, updateActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const timeoutMinutes = getTimeoutMinutes();
      if (timeoutMinutes <= 0) return; // 0 means idle lock disabled

      const timeoutMs = timeoutMinutes * 60 * 1000;
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs && !isLocked) {
        sessionStorage.removeItem("admin_screen_unlocked");
        setIsLocked(true);
        toast.info(`নিষ্ক্রিয়তার (${timeoutMinutes} মিনিট) কারণে অ্যাডমিন প্যানেল লক করা হয়েছে।`);
      }
    }, 10000); // check every 10 seconds

    return () => {
      events.forEach(evt => window.removeEventListener(evt, updateActivity));
      clearInterval(checkInterval);
    };
  }, [isLocked]);

  if (!isLocked) {
    return <>{children}</>;
  }

  const adminName = user.name || "Store Admin";
  const adminEmail = user.email || "admin@acczone.shop";

  return (
    <div className="admin-lock-overlay">
      <div className="admin-lock-card">
        <div className="lock-icon-badge">
          <ShieldCheck size={28} className="shield-emerald" />
        </div>

        <div className="lock-header">
          <div className="lock-eyebrow">
            <Lock size={12} />
            <span>SECURE WORKSPACE LOCKED</span>
          </div>
          <h1>প্যানেল লক করা রয়েছে</h1>
          <p>অ্যাডমিন ডেটা ও অর্ডার সুরক্ষার জন্য Touch ID, Passkey অথবা পাসওয়ার্ড দিয়ে আনলক করুন।</p>
        </div>

        <div className="lock-user-chip">
          <div className="lock-user-avatar">
            {adminName.slice(0, 1).toUpperCase()}
          </div>
          <div className="lock-user-details">
            <strong>{adminName}</strong>
            <span>{adminEmail}</span>
          </div>
        </div>

        {/* Primary Biometric Unlock Button */}
        <div className="lock-actions">
          <button
            type="button"
            className="button button-primary lock-biometric-btn"
            onClick={handleBiometricUnlock}
            disabled={biometricLoading || passkeyAuthOptions.isPending || passkeyVerifyAuth.isPending}
          >
            {biometricLoading || passkeyAuthOptions.isPending || passkeyVerifyAuth.isPending ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <Fingerprint size={20} className="biometric-icon" />
            )}
            <span>Touch ID / Face ID দিয়ে আনলক করুন</span>
          </button>
        </div>

        <div className="lock-divider">
          <span>অথবা পাসওয়ার্ড লিখুন</span>
        </div>

        {/* Fallback Password Unlock Form */}
        <form onSubmit={handlePasswordUnlock} className="lock-pw-form">
          <div className="password-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="অ্যাডমিন পাসওয়ার্ড দিন *"
              className="admin-password-input lock-input"
              autoFocus
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide" : "Show"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            className="button button-secondary lock-submit-btn"
            disabled={verifyUnlock.isPending || !password.trim()}
          >
            {verifyUnlock.isPending ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <KeyRound size={15} />
            )}
            <span>আনলক করুন</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="lock-footer">
          <button
            type="button"
            className="lock-logout-btn"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut size={13} />
            <span>অন্য অ্যাকাউন্টে সাইন ইন বা লগআউট</span>
          </button>
        </div>
      </div>
    </div>
  );
}
