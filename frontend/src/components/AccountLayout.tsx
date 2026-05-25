import React from 'react';
import { COLORS } from '../constants/colors';

export interface AccountMenuItem {
  id: string;
  label: string;
  icon: string;
}

interface AccountLayoutProps {
  userName: string;
  userSubtitle?: string;
  menuItems: AccountMenuItem[];
  activeId: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}

export default function AccountLayout({
  userName,
  userSubtitle,
  menuItems,
  activeId,
  onSelect,
  children,
}: AccountLayoutProps) {
  return (
    <div style={accountStyles.profileLayout}>
      <aside style={accountStyles.sidebar}>
        <div style={accountStyles.userCardShort}>
          <div style={accountStyles.avatarPlaceholder}>{userName.charAt(0) || '?'}</div>
          <h3 style={accountStyles.sidebarUserName}>{userName}</h3>
          {userSubtitle && <span style={accountStyles.sidebarUserCity}>{userSubtitle}</span>}
        </div>
        <nav style={accountStyles.sidebarNav}>
          {menuItems.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                style={{
                  ...accountStyles.navButton,
                  backgroundColor: active ? COLORS.accentLight : 'transparent',
                  color: active ? COLORS.primary : COLORS.textDark,
                  fontWeight: active ? '700' : '500',
                }}
              >
                {item.icon} {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <section style={accountStyles.contentArea}>{children}</section>
    </div>
  );
}

export const accountStyles: { [key: string]: React.CSSProperties } = {
  profileLayout: { display: 'flex', gap: '30px', alignItems: 'flex-start' },
  sidebar: {
    width: '280px',
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flexShrink: 0,
  },
  userCardShort: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: '20px',
  },
  avatarPlaceholder: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: COLORS.accentLight,
    color: COLORS.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '800',
    marginBottom: '12px',
  },
  sidebarUserName: { margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: COLORS.textDark },
  sidebarUserCity: { fontSize: '13px', color: COLORS.textMuted },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: '6px' },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    backgroundColor: 'transparent',
    textAlign: 'left',
  },
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    padding: '28px',
    minWidth: 0,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  panelTitle: { margin: 0, fontSize: '22px', fontWeight: '800', color: COLORS.textDark },
  addBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: COLORS.primary,
    color: '#FFF',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
  emptyText: { color: COLORS.textMuted, fontSize: '15px', margin: '24px 0' },
};
