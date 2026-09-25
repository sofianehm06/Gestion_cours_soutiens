import { useTranslation } from "react-i18next";
import type { PaymentStatus } from "../../shared/types";

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useTranslation();
  return <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>;
}
