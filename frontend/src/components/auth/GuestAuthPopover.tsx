import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';
import { authModalStyles as styles } from './modalStyles';

interface GuestAuthPopoverProps {
  onLogin: () => void;
  onRegister: () => void;
  onSellerLogin: () => void;
  onSellerRegister: () => void;
}

export default function GuestAuthPopover({
  onLogin,
  onRegister,
  onSellerLogin,
  onSellerRegister,
}: GuestAuthPopoverProps) {
  const [loginHovered, setLoginHovered] = useState(false);
  const [regHovered, setRegHovered] = useState(false);
  const [sellerLoginHovered, setSellerLoginHovered] = useState(false);
  const [sellerRegHovered, setSellerRegHovered] = useState(false);

  return (
    <div style={popoverWrap}>
      <div style={arrowStyle} />
      <button
        type="button"
        style={{
          ...styles.popoverButton,
          backgroundColor: loginHovered ? COLORS.primaryHover : COLORS.primary,
          color: '#FFFFFF',
        }}
        onMouseEnter={() => setLoginHovered(true)}
        onMouseLeave={() => setLoginHovered(false)}
        onClick={onLogin}
      >
        Войти
      </button>
      <button
        type="button"
        style={{
          ...styles.popoverButton,
          backgroundColor: regHovered ? COLORS.accentLight : '#FFFFFF',
          color: COLORS.textDark,
          border: `1px solid ${COLORS.border}`,
        }}
        onMouseEnter={() => setRegHovered(true)}
        onMouseLeave={() => setRegHovered(false)}
        onClick={onRegister}
      >
        Зарегистрироваться
      </button>
      <div style={dividerStyle} />
      <button
        type="button"
        style={{
          ...styles.popoverButton,
          backgroundColor: sellerLoginHovered ? COLORS.primaryHover : COLORS.primary,
          color: '#FFFFFF',
        }}
        onMouseEnter={() => setSellerLoginHovered(true)}
        onMouseLeave={() => setSellerLoginHovered(false)}
        onClick={onSellerLogin}
      >
        Вход для продавца
      </button>
      <button
        type="button"
        style={{
          ...styles.popoverButton,
          backgroundColor: sellerRegHovered ? COLORS.accentLight : '#FFFFFF',
          color: COLORS.textDark,
          border: `1px solid ${COLORS.border}`,
        }}
        onMouseEnter={() => setSellerRegHovered(true)}
        onMouseLeave={() => setSellerRegHovered(false)}
        onClick={onSellerRegister}
      >
        Регистрация продавца
      </button>
    </div>
  );
}

const popoverWrap: React.CSSProperties = {
  position: 'absolute',
  top: '52px',
  right: '-40px',
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '14px',
  boxShadow: '0 10px 25px rgba(78, 96, 83, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '200px',
  zIndex: 200,
  border: `1px solid ${COLORS.border}`,
};

const arrowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-6px',
  right: '58px',
  width: '10px',
  height: '10px',
  backgroundColor: '#FFFFFF',
  transform: 'rotate(45deg)',
  borderLeft: `1px solid ${COLORS.border}`,
  borderTop: `1px solid ${COLORS.border}`,
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: COLORS.border,
  margin: '2px 0',
};
