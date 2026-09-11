'use strict';

const toggleBtn = document.getElementById('toggle-btn');
const contactWrapper = document.getElementById('contact-wrapper');

if (toggleBtn && contactWrapper) {
  toggleBtn.addEventListener('click', () => {
    const isOpen = contactWrapper.classList.toggle('open');

    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.textContent = isOpen
      ? 'Close Contact Form'
      : 'Contact Me';
  });
}
