import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

// Daftar sifat, gugus fungsi, preset, dan akurasi model dari server (dimuat sekali).
const MetaContext = createContext({ meta: null, error: "" });

export function MetaProvider({ children }) {
  const [state, setState] = useState({ meta: null, error: "" });
  useEffect(() => {
    api
      .get("/meta")
      .then((meta) => setState({ meta, error: "" }))
      .catch((e) => setState({ meta: null, error: e.message }));
  }, []);
  return <MetaContext.Provider value={state}>{children}</MetaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useMeta = () => useContext(MetaContext);

// Label & satuan untuk satu kunci sifat.
// eslint-disable-next-line react-refresh/only-export-components
export function propInfo(meta, key) {
  return meta?.targets?.[key] || meta?.computed?.[key] || { label: key, unit: "" };
}
