// ─── Nottify Design System ───────────────────────────────────────────────────

export const dark = {
  bg: '#090909',
  bgCard: '#111111',
  bgElevated: '#161616',
  border: '#1E1E1E',
  borderStrong: '#2A2A2A',

  text: '#FFFFFF',
  textSub: '#888888',
  textMuted: '#444444',

  inputBg: '#141414',
  inputBorder: '#252525',
  inputText: '#FFFFFF',
  placeholder: '#3A3A3A',

  btnPrimaryBg: '#FFFFFF',
  btnPrimaryText: '#000000',
  btnSecondaryBg: '#141414',
  btnSecondaryText: '#FFFFFF',
  btnSecondaryBorder: '#252525',

  danger: '#FF453A',
  dangerBg: 'rgba(255,69,58,0.12)',
  dangerText: '#FF6B6B',

  success: '#30D158',
  successBg: 'rgba(48,209,88,0.12)',
  successText: '#34D399',

  overlay: 'rgba(0,0,0,0.78)',
  sidebarBg: '#0D0D0D',
  statusBar: 'light',
};

export const light = {
  bg: '#F5F5F5',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  border: '#EAEAEA',
  borderStrong: '#D5D5D5',

  text: '#0A0A0A',
  textSub: '#666666',
  textMuted: '#AAAAAA',

  inputBg: '#F0F0F0',
  inputBorder: '#E0E0E0',
  inputText: '#0A0A0A',
  placeholder: '#BBBBBB',

  btnPrimaryBg: '#0A0A0A',
  btnPrimaryText: '#FFFFFF',
  btnSecondaryBg: '#F0F0F0',
  btnSecondaryText: '#0A0A0A',
  btnSecondaryBorder: '#E0E0E0',

  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerText: '#DC2626',

  success: '#16A34A',
  successBg: '#F0FDF4',
  successText: '#16A34A',

  overlay: 'rgba(0,0,0,0.42)',
  sidebarBg: '#FFFFFF',
  statusBar: 'dark',
};

// ─── Role system ─────────────────────────────────────────────────────────────
export const ROLE = {
  student:   { color: '#3B82F6', label: 'Student' },
  lecturer:  { color: '#A855F7', label: 'Lecturer' },
  courserep: { color: '#F97316', label: 'Course Rep' },
  dean:      { color: '#06B6D4', label: 'Dean' },
};

// ─── Audience system ─────────────────────────────────────────────────────────
export const AUDIENCE = {
  all_students: { color: '#3B82F6', label: 'All Students' },
  staff_only:   { color: '#A855F7', label: 'Staff Only' },
  all:          { color: '#06B6D4', label: 'Everyone' },
};