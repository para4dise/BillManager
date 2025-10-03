// Color constants for Bill Manager app
export const COLORS = {
  // Base colors
  primary: '#2c3e50',
  secondary: '#34495e',
  background: '#f5f5f5',
  surface: '#ffffff',
  
  // Text colors
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#9E9E9E',
    inverse: '#ffffff',
  },
  
  // Status colors
  status: {
    overdue: '#FF4444',
    dueSoon: '#FFB6C1',
    paid: '#95A99B',
    unpaid: '#9E9E9E',
  },
  
  // Semantic colors
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
  
  // UI element colors
  border: '#E0E0E0',
  divider: '#BDBDBD',
  disabled: '#E0E0E0',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  
  // Gray scale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

// Status color helper function
export const getStatusColor = (status) => {
  switch (status) {
    case 'overdue':
      return COLORS.status.overdue;
    case 'dueSoon':
      return COLORS.status.dueSoon;
    case 'paid':
      return COLORS.status.paid;
    case 'unpaid':
    default:
      return COLORS.status.unpaid;
  }
};

// Opacity helper
export const withOpacity = (color, opacity) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};