'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /*
   * CONTACT FORM
   */

  const toggleBtn = document.getElementById('toggle-btn');
  const contactWrapper = document.getElementById('contact-wrapper');

  if (toggleBtn && contactWrapper) {

    toggleBtn.addEventListener('click', () => {

      const isOpen =
        contactWrapper.classList.toggle('open');

      toggleBtn.setAttribute(
        'aria-expanded',
        String(isOpen)
      );

      toggleBtn.textContent =
        isOpen
          ? 'Close Contact Form'
          : 'Contact Me';
    });
  }


  /*
   * BACKGROUND MUSIC
   */

  const musicToggle =
    document.getElementById('music-toggle');

  const siteAudio =
    document.getElementById('site-audio');

  if (!musicToggle || !siteAudio) {
    return;
  }


  /*
   * Set volume.
   *
   * This does NOT bypass autoplay restrictions.
   * It simply sets the volume once playback
   * has been permitted by the browser.
   */

  siteAudio.volume = 0.3;


  /*
   * Keep the WIP button synchronized
   * with the real audio state.
   */

  function updateMusicButton() {

    const playing = !siteAudio.paused;

    musicToggle.classList.toggle(
      'playing',
      playing
    );

    musicToggle.setAttribute(
      'aria-pressed',
      String(playing)
    );

    musicToggle.setAttribute(
      'aria-label',
      playing
        ? 'Pause background music'
        : 'Play background music'
    );

    musicToggle.textContent =
      playing
        ? 'Work In Progress ♪'
        : 'Work In Progress';
  }


  /*
   * Try to start the music automatically.
   *
   * Modern browsers may reject this because
   * audible autoplay is commonly blocked.
   *
   * That is expected behaviour.
   */

  siteAudio.play()
    .then(() => {
      updateMusicButton();
    })
    .catch(() => {
      updateMusicButton();
    });


  /*
   * WIP BUTTON
   *
   * Click once  = play
   * Click again = pause
   */

  musicToggle.addEventListener('click', () => {

    if (siteAudio.paused) {

      siteAudio.play()
        .then(() => {
          updateMusicButton();
        })
        .catch(() => {
          updateMusicButton();
        });

    } else {

      siteAudio.pause();

      updateMusicButton();
    }
  });


  /*
   * Keep UI synchronized if the browser
   * changes the playback state.
   */

  siteAudio.addEventListener(
    'play',
    updateMusicButton
  );

  siteAudio.addEventListener(
    'pause',
    updateMusicButton
  );

  siteAudio.addEventListener(
    'ended',
    updateMusicButton
  );

});
