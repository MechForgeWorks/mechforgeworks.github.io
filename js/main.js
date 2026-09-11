'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-btn');
  const contactWrapper = document.getElementById('contact-wrapper');
  const musicToggle = document.getElementById('music-toggle');
  const siteAudio = document.getElementById('site-audio');

  /*
   * Contact form
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
   * Music
   */

  if (!musicToggle || !siteAudio) {
    console.error('Music elements not found.');
    return;
  }

  siteAudio.volume = 0.3;

  function updateMusicButton() {
    const playing = !siteAudio.paused;

    musicToggle.classList.toggle('playing', playing);
    musicToggle.setAttribute(
      'aria-pressed',
      String(playing)
    );

    musicToggle.textContent = playing
      ? 'Work In Progress ♪'
      : 'Work In Progress';
  }

  /*
   * Try autoplay.
   * Browsers may block audible autoplay.
   */

  siteAudio.play()
    .then(() => {
      console.log('Music autoplay started.');
      updateMusicButton();
    })
    .catch((error) => {
      console.log('Autoplay blocked:', error);
      updateMusicButton();
    });

  /*
   * WIP button = play / pause
   */

  musicToggle.addEventListener('click', () => {
    if (siteAudio.paused) {
      siteAudio.play()
        .then(() => {
          console.log('Music started.');
          updateMusicButton();
        })
        .catch((error) => {
          console.error('Music failed to play:', error);
        });
    } else {
      siteAudio.pause();
      console.log('Music paused.');
      updateMusicButton();
    }
  });

  /*
   * Keep button state synced with audio.
   */

  siteAudio.addEventListener('play', updateMusicButton);
  siteAudio.addEventListener('pause', updateMusicButton);

  siteAudio.addEventListener('ended', () => {
    updateMusicButton();
  });

  siteAudio.addEventListener('error', () => {
    console.error('Audio loading error:', siteAudio.error);
  });
});
