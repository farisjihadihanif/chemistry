import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/Auth";
import { MetaProvider } from "./context/Meta";
import { ThemeProvider, useTheme } from "./context/Theme";
import { CollectProvider } from "./context/Collect";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Home from "./pages/Home";
import { ForgotPassword, Login, Register, ResetPassword } from "./pages/Auth";
import { DataModel, NotFound, Privacy, Terms } from "./pages/Static";

const Discover = lazy(() => import("./pages/Discover"));
const DiscoveryResult = lazy(() => import("./pages/DiscoveryResult"));
const History = lazy(() => import("./pages/History"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Compound = lazy(() => import("./pages/Compound"));
const Calculator = lazy(() => import("./pages/Calculator"));
const Library = lazy(() => import("./pages/Library"));
const Compare = lazy(() => import("./pages/Compare"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/Admin"));

const auth = (el, admin) => <RequireAuth admin={admin}>{el}</RequireAuth>;

function Toasts() {
  const { dark } = useTheme();
  return <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar theme={dark ? "dark" : "light"} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <MetaProvider>
            <CollectProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="temukan" element={auth(<Discover />)} />
                  <Route path="temukan/:id" element={auth(<DiscoveryResult />)} />
                  <Route path="riwayat" element={auth(<History />)} />
                  <Route path="favorit" element={auth(<Favorites />)} />
                  <Route path="kalkulator" element={auth(<Calculator />)} />
                  <Route path="asisten" element={auth(<Assistant />)} />
                  <Route path="akun" element={auth(<Account />)} />
                  <Route path="admin" element={auth(<Admin />, true)} />
                  <Route path="senyawa/:cid" element={<Compound />} />
                  <Route path="pustaka" element={<Library />} />
                  <Route path="bandingkan" element={<Compare />} />
                  <Route path="data" element={<DataModel />} />
                  <Route path="ketentuan" element={<Terms />} />
                  <Route path="privasi" element={<Privacy />} />
                  <Route path="masuk" element={<Login />} />
                  <Route path="daftar" element={<Register />} />
                  <Route path="lupa-password" element={<ForgotPassword />} />
                  <Route path="reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
              <Toasts />
            </CollectProvider>
          </MetaProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
