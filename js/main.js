'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /*
   * ========================================
   * ELEMENTS
   * ========================================
   */

  const toggleBtn =
    document.getElementById('toggle-btn');

  const contactWrapper =
    document.getElementById('contact-wrapper');

  const musicControl =
    document.getElementById('music-control');

  const siteAudio =
    document.getElementById('site-audio');


  /*
   * ========================================
   * MUSIC STATE
   * ========================================
   */

  let musicStarted = false;


  /*
   * ========================================
   * MUSIC
   * ========================================
   */

  if (siteAudio) {

    siteAudio.volume = 0.3;

    /*
     * Autoplay attempt.
     */

    const autoplayAttempt =
      siteAudio.play();

    if (autoplayAttempt) {

      autoplayAttempt
        .then(() => {

          musicStarted = true;

        })
        .catch(() => {

          /*
           * Browser blocked autoplay.
           *
           * Contact Me will start the music
           * when the visitor clicks it.
           */

        });
    }
  }


  /*
   * ========================================
   * CONTACT FORM
   * ========================================
   *
   * Contact Me opens the form.
   *
   * It does NOT close the form again.
   */

  if (toggleBtn && contactWrapper) {

    toggleBtn.addEventListener(
      'click',
      () => {

        /*
         * If autoplay was blocked, use this
         * genuine user interaction to start
         * the music.
         */

        if (
          siteAudio &&
          !musicStarted
        ) {

          siteAudio.play()
            .then(() => {

              musicStarted = true;

              updateMusicControl();

            })
            .catch(() => {
              /*
               * Music failed to start.
               * The contact form still opens.
               */
            });
        }


        /*
         * Open the contact form.
         */

        contactWrapper.classList.add('open');

        toggleBtn.setAttribute(
          'aria-expanded',
          'true'
        );

        /*
         * Contact Me remains the label.
         *
         * There is deliberately no
         * "Close Contact Form" option.
         */

        toggleBtn.textContent = 'Contact Me';
      }
    );
  }


  /*
   * ========================================
   * MUSIC CONTROL
   * ========================================
   */

  function updateMusicControl() {

    if (!musicControl || !siteAudio) {
      return;
    }

    const playing =
      !siteAudio.paused &&
      !siteAudio.ended;

    musicControl.textContent =
      playing
        ? 'Pause music'
        : 'Play music';

    musicControl.setAttribute(
      'aria-label',
      playing
        ? 'Pause background music'
        : 'Play background music'
    );

    musicControl.setAttribute(
      'aria-pressed',
      String(!playing)
    );
  }


  /*
   * ========================================
   * PAUSE / PLAY MUSIC
   * ========================================
   */

  if (musicControl && siteAudio) {

    musicControl.addEventListener(
      'click',
      () => {

        if (siteAudio.paused) {

          siteAudio.play()
            .then(() => {

              musicStarted = true;
              updateMusicControl();

            })
            .catch(() => {

              updateMusicControl();

            });

        } else {

          siteAudio.pause();

          updateMusicControl();
        }
      }
    );


    /*
     * Keep the control synchronized with
     * the actual audio state.
     */

    siteAudio.addEventListener(
      'play',
      () => {

        musicStarted = true;
        updateMusicControl();

      }
    );

    siteAudio.addEventListener(
      'pause',
      updateMusicControl
    );

    siteAudio.addEventListener(
      'ended',
      updateMusicControl
    );
  }

});
