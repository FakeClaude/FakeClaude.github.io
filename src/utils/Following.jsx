// utils/Following.jsx
import { h } from "preact";
import Home from "../home.jsx";
import {useTranslation} from "react-i18next";

export default function Following(props) {
    const {t} = useTranslation();
  return (
    <Home
      sortBy="following"
      {...props}
      emptyComponent={
        <div className="card-list-empty">
            {t('nav.No following yet,You can follow without logging in')}
        </div>
      }
    />
  );
}