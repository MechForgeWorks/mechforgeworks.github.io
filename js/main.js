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

    /*
     * Keep the background music subtle.
     */

    siteAudio.volume = 0.3;


    /*
     * If autoplay works, remember that
     * playback has already started.
     */

    siteAudio.addEventListener(
      'play',
      () => {
        musicStarted = true;
      }
    );


    /*
     * Attempt audible autoplay.
     *
     * The browser may reject this with
     * NotAllowedError. That is normal.
     */

    const autoplayAttempt =
      siteAudio.play();

    if (autoplayAttempt) {

      autoplayAttempt
        .then(() => {

          musicStarted = true;

        })
        .catch((error) => {

          /*
           * Autoplay was refused.
           *
           * We deliberately do not show a
           * music control.
           *
           * The Contact Me click below will
           * become our user-gesture fallback.
           */

          if (error.name !== 'NotAllowedError') {

            console.warn(
              'Background music could not start:',
              error
            );
          }

        });
    }
  }


  /*
   * ========================================
   * CONTACT BUTTON
   * ========================================
   */

  if (toggleBtn && contactWrapper) {

    toggleBtn.addEventListener(
      'click',
      () => {

        /*
         * --------------------------------
         * MUSIC FALLBACK
         * --------------------------------
         *
         * If autoplay was blocked, this
         * click is a genuine user gesture.
         *
         * Start the music here.
         *
         * We do this BEFORE opening the form
         * so the play() call occurs directly
         * inside the click event.
         */

        if (
          siteAudio &&
          !musicStarted
        ) {

          siteAudio.play()
            .then(() => {

              musicStarted = true;

            })
            .catch(() => {

              /*
               * If even a user-initiated play
               * fails, leave the contact form
               * working normally.
               */

            });
        }


        /*
         * --------------------------------
         * CONTACT FORM
         * --------------------------------
         */

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
      }
    );
  }

});
