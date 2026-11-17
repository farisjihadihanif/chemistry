import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../lib/api";
import { useAuth } from "./Auth";

// Favorit (tersimpan di server) + daftar bandingkan (maks 3, di browser).
const CollectContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const keyOf = (c) => (c?.cid ? `cid:${c.cid}` : c?.smiles ? `smi:${c.smiles}` : "");
const MAX_COMPARE = 3;

export function CollectProvider({ children }) {
  const { user } = useAuth();
  const [favKeys, setFavKeys] = useState(new Set());
  const [compare, setCompare] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("compare") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem("compare", JSON.stringify(compare));
    } catch {
      /* abaikan */
    }
  }, [compare]);
  useEffect(() => {
    if (!user) {
      setFavKeys(new Set());
      return;
    }
    api.get("/favorites/keys").then((r) => setFavKeys(new Set(r.keys))).catch(() => {});
  }, [user]);

  const toggleFav = useCallback(
    async (c, discoveryId) => {
      const k = keyOf(c);
      const on = favKeys.has(k);
      setFavKeys((s) => {
        const n = new Set(s);
        on ? n.delete(k) : n.add(k);
        return n;
      });
      try {
        if (on) await api.post("/favorites/remove", { compound: c });
        else await api.post("/favorites", { compound: c, discovery: discoveryId });
        toast.success(on ? "Dihapus dari favorit." : "Disimpan ke favorit.");
      } catch (e) {
        toast.error(e.message);
        setFavKeys((s) => {
          const n = new Set(s);
          on ? n.add(k) : n.delete(k);
          return n;
        });
      }
    },
    [favKeys],
  );

  const toggleCompare = (c) => {
    const k = keyOf(c);
    setCompare((list) => {
      if (list.some((x) => keyOf(x) === k)) return list.filter((x) => keyOf(x) !== k);
      if (list.length >= MAX_COMPARE) {
        toast.info(`Maksimal ${MAX_COMPARE} senyawa untuk dibandingkan.`);
        return list;
      }
      return [...list, { cid: c.cid, name: c.name, formula: c.formula, smiles: c.smiles, groups: c.groups, properties: c.properties, origin: c.origin, score: c.score, pubchem_cid: c.pubchem_cid }];
    });
  };

  return (
    <CollectContext.Provider value={{ favKeys, toggleFav, compare, toggleCompare, inCompare: (c) => compare.some((x) => keyOf(x) === keyOf(c)), clearCompare: () => setCompare([]) }}>
      {children}
    </CollectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCollect = () => useContext(CollectContext);
