// 修改后的完整文件内容
import { h } from "preact";
import Home from "../home.jsx";
import { useTranslation } from "react-i18next";

export default function MyEvents(props) {
  const { t } = useTranslation();
  return (
    <Home
      isMyEvents={true}
      {...props}
      emptyComponent={
        <div className="card-list-empty">
            {t('nav.No events yet,You can create events without logging in')}
        </div>
      }
    />
  );
}