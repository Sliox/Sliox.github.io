// Tema claro/oscuro y año del pie. Sin dependencias.
(function () {
  'use strict';
  var root = document.documentElement;

  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* modo privado */ }
    });
  }

  var years = document.querySelectorAll('[data-year]');
  for (var i = 0; i < years.length; i += 1) { years[i].textContent = new Date().getFullYear(); }
}());
