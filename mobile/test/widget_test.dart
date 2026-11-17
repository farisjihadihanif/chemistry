import 'package:chemistry/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('format angka gaya Indonesia', () {
    expect(fmtValue(78.265, 'boiling_point'), '78,3');
    expect(fmtValue(154, 'boiling_point'), '154');
    expect(fmtValue(1261, 'x'), '1.261');
    expect(fmtValue(0.7893, 'density'), '0,789');
    expect(fmtValue(0.000168, 'vapor_pressure'), '1,7 × 10⁻⁴');
    expect(fmtValue(3.0, 'hba'), '3');
    expect(fmtValue(0.80, 'viscosity'), '0,8');
    expect(rangeText({'min': 60, 'max': 160}, '°C'), '60 – 160 °C');
    expect(rangeText({'max': 0}, '°C'), '≤ 0 °C');
  });
}
