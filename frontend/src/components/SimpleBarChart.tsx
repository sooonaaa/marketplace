import React from 'react';
import { COLORS } from '../constants/colors';

interface ChartItem {
  label: string;
  value: number;
}

export default function SimpleBarChart({ title, data, color = COLORS.primary }: { title: string; data: ChartItem[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={styles.wrap}>
      <h4 style={styles.title}>{title}</h4>
      <div style={styles.chart}>
        {data.map((item) => (
          <div key={item.label} style={styles.barCol}>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barFill,
                  height: `${(item.value / max) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span style={styles.value}>{item.value}</span>
            <span style={styles.label}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  wrap: { backgroundColor: '#FAFBF9', borderRadius: '12px', padding: '16px', border: `1px solid ${COLORS.border}` },
  title: { margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: COLORS.textDark },
  chart: { display: 'flex', alignItems: 'flex-end', gap: '10px', height: '140px' },
  barCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: 0 },
  barTrack: { width: '100%', height: '100px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  barFill: { width: '70%', borderRadius: '6px 6px 0 0', minHeight: '4px', transition: 'height 0.3s' },
  value: { fontSize: '11px', fontWeight: '700', color: COLORS.textDark },
  label: { fontSize: '10px', color: COLORS.textMuted, textAlign: 'center' },
};
