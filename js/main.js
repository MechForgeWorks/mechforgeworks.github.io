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

  const contactForm =
    document.getElementById('contact-form');

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
     * Attempt audible autoplay.
     *
     * Most browsers will block this unless
     * the visitor has previously interacted
     * with the site or granted permission.
     */

    const autoplayAttempt =
      siteAudio.play();

    if (autoplayAttempt) {

      autoplayAttempt
        .then(() => {

          musicStarted = true;
          updateMusicControl();

        })
        .catch(() => {

          /*
           * Browser blocked autoplay.
           *
           * Contact Me will start the music
           * when the visitor clicks it.
           */

          updateMusicControl();

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
   * The button then disappears because it
   * is no longer needed.
   */

  if (toggleBtn && contactWrapper) {

    toggleBtn.addEventListener(
      'click',
      () => {

        /*
         * MUSIC FALLBACK
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

              updateMusicControl();

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
         * Hide the Contact Me button.
         */

        toggleBtn.style.display = 'none';


        /*
         * Focus the name field after the
         * form animation has started.
         */

        setTimeout(() => {

          document
            .getElementById('f-name')
            ?.focus();

        }, 350);

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


  /*
   * ========================================
   * FORM SUBMISSION
   * ========================================
   *
   * Prevent accidental double submissions.
   */

  if (contactForm) {

    contactForm.addEventListener(
      'submit',
      () => {

        const submitBtn =
          contactForm.querySelector(
            '.submit-btn'
          );

        if (submitBtn) {

          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending...';

        }

      }
    );
  }


  /*
   * ========================================
   * INITIAL MUSIC CONTROL STATE
   * ========================================
   */

  updateMusicControl();

});
