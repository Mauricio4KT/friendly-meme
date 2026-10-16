const themeKey = 'noan-beauty-theme';
const themeButtons = document.querySelectorAll('[data-theme-toggle]');

const applyTheme = isDark => {
  document.documentElement.classList.toggle('dark-theme', isDark);
  themeButtons.forEach(button => {
    button.textContent = isDark ? '☀️ Modo claro' : '🌙 Modo oscuro';
    button.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    button.setAttribute('aria-pressed', String(isDark));
  });
};

let isDark = false;
try {
  isDark = localStorage.getItem(themeKey) === 'dark';
} catch (error) {
  console.warn('No se pudo leer la preferencia de tema guardada:', error);
}
applyTheme(isDark);

themeButtons.forEach(button => button.addEventListener('click', () => {
  isDark = !document.documentElement.classList.contains('dark-theme');
  applyTheme(isDark);
  try {
    localStorage.setItem(themeKey, isDark ? 'dark' : 'light');
  } catch (error) {
    console.error('No se pudo guardar la preferencia de tema:', error);
  }
}));
