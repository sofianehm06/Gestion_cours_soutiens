import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppContext, type AppContextValue, type NavParams, type Page } from "./app-context";
import { Icon, type IconName } from "./components/Icon";
import { StudentDetail } from "./components/StudentDetail";
import { DashboardPage } from "./pages/DashboardPage";
import { GroupsPage } from "./pages/GroupsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { AttendancePage } from "./pages/AttendancePage";
import { PaymentsPage } from "./pages/PaymentsPage";

const NAV: { page: Page; icon: IconName }[] = [
  { page: "dashboard", icon: "dashboard" },
  { page: "groups", icon: "groups" },
  { page: "students", icon: "students" },
  { page: "attendance", icon: "attendance" },
  { page: "payments", icon: "payments" },
];

interface Toast {
  id: number;
  message: string;
  kind: "success" | "error";
}

export function App() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState<Page>("dashboard");
  const [params, setParams] = useState<NavParams>({});
  // Change à chaque navigation pour réinitialiser l'écran affiché.
  const [navKey, setNavKey] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [detailStudent, setDetailStudent] = useState<number | null>(null);
  const toastId = useRef(0);

  const notify = useCallback((message: string, kind: "success" | "error" = "success") => {
    const id = ++toastId.current;
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), kind === "error" ? 6000 : 2500);
  }, []);

  const navigate = useCallback((next: Page, nextParams: NavParams = {}) => {
    setPage(next);
    setParams(nextParams);
    setNavKey((k) => k + 1);
  }, []);

  const context = useMemo<AppContextValue>(
    () => ({ page, params, navigate, notify, openStudent: setDetailStudent }),
    [page, params, navigate, notify],
  );

  const toggleLanguage = () => void i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar");

  return (
    <AppContext.Provider value={context}>
      <div className="layout">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-logo">S</div>
            <div>
              <div className="brand-name">{t("app.name")}</div>
              <div className="brand-tagline">{t("app.tagline")}</div>
            </div>
          </div>
          <nav>
            {NAV.map((item) => (
              <button
                key={item.page}
                type="button"
                className={`nav-item ${page === item.page ? "active" : ""}`}
                onClick={() => navigate(item.page)}
              >
                <Icon name={item.icon} />
                <span>{t(`nav.${item.page}`)}</span>
              </button>
            ))}
          </nav>
          <button type="button" className="lang-switch" onClick={toggleLanguage} title={t("common.language")}>
            <Icon name="globe" size={16} />
            <span>{i18n.language === "ar" ? "Français" : "العربية"}</span>
          </button>
        </aside>

        <main className="content" key={navKey}>
          {!window.api && <div className="alert alert-error">{t("errors.noElectron")}</div>}
          {page === "dashboard" && <DashboardPage />}
          {page === "groups" && <GroupsPage />}
          {page === "students" && <StudentsPage />}
          {page === "attendance" && <AttendancePage />}
          {page === "payments" && <PaymentsPage />}
        </main>
      </div>

      {detailStudent !== null && <StudentDetail studentId={detailStudent} onClose={() => setDetailStudent(null)} />}

      <div className="toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            <Icon name={toast.kind === "error" ? "warning" : "check"} size={16} />
            {toast.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
