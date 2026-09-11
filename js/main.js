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

    const setMusicState = (playing) => {
      musicToggle.classList.toggle('playing', playing);
      musicToggle.setAttribute('aria-pressed', String(playing));
      musicToggle.setAttribute(
        'aria-label',
        playing
          ? 'Pause background music'
          : 'Play background music'
      );
    };

    /*
     * Try to autoplay when the page loads.
     *
     * Browsers may block audible autoplay.
     * If they do, the first click on the WIP badge
     * will start the music.
     */

    siteAudio.play()
      .then(() => {
        setMusicState(true);
      })
      .catch((error) => {
        console.info(
          'Autoplay was blocked by the browser. Click the WIP badge to start the music.',
          error
        );

        setMusicState(false);
      });

    /*
     * WIP badge = play / pause
     */

    musicToggle.addEventListener('click', async () => {
      if (siteAudio.paused) {
        try {
          await siteAudio.play();
          setMusicState(true);
        } catch (error) {
          console.error('Unable to play audio:', error);
          setMusicState(false);
        }
      } else {
        siteAudio.pause();
        setMusicState(false);
      }
    });

    /*
     * Track finished
     */

    siteAudio.addEventListener('ended', () => {
      setMusicState(false);
    });

    /*
     * Audio failed to load
     */

    siteAudio.addEventListener('error', () => {
      console.error(
        'Audio failed to load:',
        siteAudio.error
      );

      setMusicState(false);
    });
  }
});
