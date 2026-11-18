// Tema claro/oscuro, menú en móvil, botón "Contacto" y año del pie. Sin dependencias.
(function () {
  'use strict';
  var root = document.documentElement;

  // Tema
  var toggle = document.querySelector('.theme-toggle button');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* modo privado */ }
    });
  }

  // Menú colapsado (pantallas angostas)
  var navBtn = document.querySelector('.navicon-btn');
  var hidden = document.querySelector('.hidden-links');
  if (navBtn && hidden) {
    navBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      hidden.hidden = !hidden.hidden;
      navBtn.setAttribute('aria-expanded', String(!hidden.hidden));
    });
    document.addEventListener('click', function (e) {
      if (!hidden.hidden && !hidden.contains(e.target)) { hidden.hidden = true; navBtn.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Botón "Contacto" de la barra lateral (sólo visible en pantallas angostas)
  var contactBtn = document.querySelector('.author__urls-wrapper .btn');
  var urls = document.querySelector('.author__urls');
  if (contactBtn && urls) {
    contactBtn.addEventListener('click', function () {
      var open = urls.classList.toggle('is-open');
      contactBtn.setAttribute('aria-expanded', String(open));
    });
  }

  var years = document.querySelectorAll('[data-year]');
  for (var i = 0; i < years.length; i += 1) { years[i].textContent = new Date().getFullYear(); }
}());
