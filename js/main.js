'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-btn');
  const contactWrapper = document.getElementById('contact-wrapper');

  const musicToggle = document.getElementById('music-toggle');
  const siteAudio = document.getElementById('site-audio');

  /*
   * Contact form toggle
   */

  if (toggleBtn && contactWrapper) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = contactWrapper.classList.toggle('open');

      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      toggleBtn.textContent = isOpen
        ? 'Close Contact Form'
        : 'Contact Me';
    });
  }

  /*
   * WIP badge / background music
   */

  if (musicToggle && siteAudio) {
    siteAudio.volume = 0.3;

    musicToggle.addEventListener('click', async () => {
      if (siteAudio.paused) {
        try {
          await siteAudio.play();

          musicToggle.classList.add('playing');
          musicToggle.setAttribute('aria-pressed', 'true');
          musicToggle.setAttribute(
            'aria-label',
            'Pause background music'
          );
        } catch {
          musicToggle.classList.remove('playing');
          musicToggle.setAttribute('aria-pressed', 'false');
          musicToggle.setAttribute(
            'aria-label',
            'Play background music'
          );
        }
      } else {
        siteAudio.pause();

        musicToggle.classList.remove('playing');
        musicToggle.setAttribute('aria-pressed', 'false');
        musicToggle.setAttribute(
          'aria-label',
          'Play background music'
        );
      }
    });

    siteAudio.addEventListener('ended', () => {
      musicToggle.classList.remove('playing');
      musicToggle.setAttribute('aria-pressed', 'false');
      musicToggle.setAttribute(
        'aria-label',
        'Play background music'
      );
    });
  }
});
