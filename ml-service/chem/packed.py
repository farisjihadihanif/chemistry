"""Random Forest dalam bentuk ringkas: 10 byte per simpul, tanpa mengimpor scikit-learn.

Anak kiri selalu simpul berikutnya (urutan depth-first scikit-learn), jadi cukup menyimpan anak kanan.
`value` berisi ambang (simpul cabang) atau nilai prediksi (daun, feature = -1).
"""
import numpy as np

CHUNK = 64  # baris per putaran, supaya memori prediksi terbatas


def _floor32(t):
    """float32 terbesar yang <= t: hasil `x <= t` untuk x float32 tetap persis sama."""
    f = t.astype(np.float32)
    return np.where(f.astype(np.float64) > t, np.nextafter(f, np.float32(-np.inf)), f)


def pack(model):
    feature, value, right, roots, n = [], [], [], [], 0
    for est in model.estimators_:
        t = est.tree_
        leaf = t.children_left == -1
        if not np.array_equal(t.children_left[~leaf], np.flatnonzero(~leaf) + 1):
            raise ValueError("urutan simpul pohon tidak didukung")
        feature.append(np.where(leaf, -1, t.feature).astype(np.int16))
        value.append(np.where(leaf, t.value[:, 0, 0].astype(np.float32), _floor32(t.threshold)))
        right.append(np.where(leaf, -1, t.children_right + n).astype(np.int32))
        roots.append(n)
        n += t.node_count
    return {
        "feature": np.concatenate(feature),
        "value": np.concatenate(value),
        "right": np.concatenate(right),
        "roots": np.array(roots, dtype=np.int32),
    }


class PackedForest:
    def __init__(self, feature, value, right, roots):
        self.feature, self.value, self.right, self.roots = feature, value, right, roots

    def mean_sd(self, X):
        """Rata-rata dan simpangan baku antar pohon, per baris X."""
        X = np.asarray(X, dtype=np.float32)
        mean, sd = np.empty(len(X)), np.empty(len(X))
        for s in range(0, len(X), CHUNK):
            part = X[s : s + CHUNK]
            per_tree = self._leaves(part)
            mean[s : s + len(part)], sd[s : s + len(part)] = per_tree.mean(1), per_tree.std(1)
        return mean, sd

    def _leaves(self, X):
        n, trees = len(X), len(self.roots)
        cur = np.tile(self.roots, n)
        row = np.repeat(np.arange(n), trees)
        out = np.empty(cur.size, dtype=np.int32)
        active = np.arange(cur.size)
        while active.size:
            f = self.feature[cur]
            inner = f >= 0
            if not inner.all():
                out[active[~inner]] = cur[~inner]
                active, cur, row, f = active[inner], cur[inner], row[inner], f[inner]
            cur = np.where(X[row, f] <= self.value[cur], cur + 1, self.right[cur])
        return self.value[out].astype(np.float64).reshape(n, trees)
