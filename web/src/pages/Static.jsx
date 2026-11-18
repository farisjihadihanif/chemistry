import { Link } from "react-router-dom";
import { useMeta } from "../context/Meta";
import { PageLoader } from "../components/ui";

export function NotFound() {
  return (
    <div className="container-page grid min-h-[50vh] place-items-center py-16 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-soft">Mungkin tautannya salah atau halamannya sudah dipindah.</p>
        <Link to="/" className="btn-primary mt-6">Kembali ke beranda</Link>
      </div>
    </div>
  );
}

export function DataModel() {
  const { meta } = useMeta();
  if (!meta) return <PageLoader />;
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-semibold">Tentang data</h1>
      <div className="prose-chem prose-page mt-6">
        <p>Halaman ini menjelaskan bagaimana angka di Chemistry disusun dan seberapa bisa dipercaya.</p>
        <h2>Pustaka senyawa</h2>
        <p>
          Pustaka berisi sifat fisik hasil pengukuran laboratorium. Teks seperti &ldquo;352 °F at 12 mmHg&rdquo; diubah ke satuan baku. Nilai yang meragukan dibuang: batas (&gt; 93 °C), titik didih pada tekanan rendah, fase gas, dan titik didih yang lebih rendah dari titik lelehnya sendiri. Bila satu senyawa punya beberapa nilai, dipakai mediannya.
        </p>
        <p>Hanya senyawa organik tunggal dengan unsur C, H, N, O, S, P, F, Cl, Br, I, Si, dan B yang disertakan, totalnya <span className="num">{meta.compounds.toLocaleString("id-ID")}</span> senyawa.</p>
        <h2>Nilai perkiraan</h2>
        <p>
          Untuk sifat yang belum pernah diukur, Chemistry memperkirakannya dari struktur molekul: ukuran, bentuk, kepolaran, cincin, dan gugus fungsinya. Ketepatannya diuji pada senyawa yang tidak dipakai saat belajar, sehingga angkanya jujur.
        </p>
        <table>
          <thead>
            <tr><th>Sifat</th><th>Data terukur</th><th>Selisih rata-rata</th><th>Ketepatan</th></tr>
          </thead>
          <tbody>
            {Object.entries(meta.targets).map(([k, t]) => (
              <tr key={k}>
                <td>{t.label}</td>
                <td className="num">{t.experimental.toLocaleString("id-ID")}</td>
                <td className="num">{t.log ? `≈ ×${(10 ** t.mae).toFixed(1)}` : `${t.mae} ${t.unit}`}</td>
                <td className="num">{t.r2 != null ? `${Math.round(t.r2 * 100)}%` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Perkiraan titik leleh, densitas, dan tekanan uap cukup andal untuk menyaring. Viskositas, tegangan permukaan, dan suhu penyalaan sendiri datanya sedikit, jadi perkiraannya kasar dan sebaiknya hanya dipakai sebagai arah. Rentang di samping setiap nilai perkiraan menunjukkan tingkat keyakinan; makin lebar, makin perlu diuji.
        </p>
        <h2>Kandidat senyawa baru</h2>
        <p>
          Kandidat dibuat dari senyawa paling cocok dengan modifikasi kimia yang lazim: memperpanjang atau memendekkan rantai, menambah cabang metil, mengubah gugus OH menjadi eter atau ester, menukar halogen, dan sejenisnya. Semua kandidat diperiksa kebenaran strukturnya, diperkirakan sifatnya, diberi skor kesulitan sintesis (1 = mudah, 10 = sulit), lalu dicek apakah strukturnya sudah dikenal.
        </p>
        <h2>Batasan</h2>
        <ul>
          <li>Nilai perkiraan bukan pengganti uji laboratorium.</li>
          <li>Campuran, polimer, garam, dan senyawa anorganik belum didukung.</li>
          <li>Klasifikasi bahaya GHS bisa berbeda antar pemasok; selalu baca SDS.</li>
        </ul>
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl font-semibold">Ketentuan penggunaan</h1>
      <div className="prose-chem prose-page mt-6">
        <p>Chemistry adalah alat bantu riset. Dengan memakainya, kamu memahami hal berikut.</p>
        <ul>
          <li>Hasil rekomendasi, terutama nilai perkiraan dan kandidat senyawa baru, adalah perkiraan komputasi. Jangan dipakai sebagai satu-satunya dasar keputusan produksi, keselamatan, atau regulasi.</li>
          <li>Penanganan dan sintesis senyawa harus mengikuti SDS, prosedur keselamatan laboratorium, dan peraturan yang berlaku.</li>
          <li>Dilarang memakai Chemistry untuk merancang bahan peledak, senjata kimia, racun, atau narkotika. Akun yang melanggar dinonaktifkan.</li>
          <li>Pencarian dari kalimat dan Chesty dibatasi jumlah pemakaiannya per hari supaya adil untuk semua pengguna.</li>
        </ul>
      </div>
    </div>
  );
}

export function Privacy() {
  const { meta } = useMeta();
  const email = meta?.contactEmail;
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl font-semibold">Kebijakan privasi</h1>
      <p className="mt-2 text-sm text-ink-mute">Berlaku sejak 18 November 2026</p>
      <div className="prose-chem prose-page mt-6">
        <h2>Data yang disimpan</h2>
        <ul>
          <li><strong>Akun:</strong> nama, username, email, institusi (opsional), dan password dalam bentuk hash.</li>
          <li><strong>Pemakaian:</strong> kriteria dan hasil pencarian, favorit beserta catatan, foto profil (opsional), serta percakapan dengan Chesty.</li>
        </ul>
        <h2>Pihak lain</h2>
        <ul>
          <li>Layanan pemrosesan bahasa pihak ketiga memproses kalimat kebutuhan, pertanyaan ke Chesty, dan daftar senyawa hasil pencarian untuk membuat kriteria dan alasan.</li>
          <li>Basis data senyawa publik dipakai untuk mencari nama senyawa dan data bahaya. Yang dikirim hanya nama atau struktur senyawa, bukan data akunmu.</li>
          <li>Database disimpan di penyedia cloud. Email lupa password dikirim lewat layanan email.</li>
        </ul>
        <p>Kami tidak menjual data, tidak memasang iklan, dan tidak memakai pelacak analitik. Cookie hanya dipakai untuk menjaga kamu tetap masuk dan mengingat akun yang pernah masuk di perangkat ini; pilihan tema disimpan di browser.</p>
        <h2>Menghapus data</h2>
        <p>Di halaman <Link to="/akun">Akun</Link>, pilih Hapus akun. Semua riwayat, favorit, dan percakapan ikut terhapus permanen.</p>
        {email && (
          <>
            <h2>Kontak</h2>
            <p><a href={`mailto:${email}`}>{email}</a></p>
          </>
        )}
      </div>
    </div>
  );
}
