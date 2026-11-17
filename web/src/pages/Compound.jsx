import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import CompoundView from "../components/CompoundView";
import { Empty, PageLoader } from "../components/ui";

export default function Compound() {
  const { cid } = useParams();
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setC(null);
    setError("");
    api.get(`/compounds/${cid}`).then((r) => setC(r.compound)).catch((e) => setError(e.message));
  }, [cid]);
  useEffect(() => {
    if (c) document.title = `${c.name || c.formula} · Chemistry`;
    return () => {
      document.title = "Chemistry";
    };
  }, [c]);
  if (error) return <div className="container-page py-16"><Empty title="Senyawa tidak ditemukan">{error}</Empty></div>;
  if (!c) return <PageLoader />;
  return <div className="container-page py-8"><CompoundView c={c} /></div>;
}
