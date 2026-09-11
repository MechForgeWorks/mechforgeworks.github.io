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

  const nameField =
    document.getElementById('f-name');

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
   * MUSIC CONTROL DISPLAY
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
   * MUSIC AUTOPLAY
   * ========================================
   */

  if (siteAudio) {

    siteAudio.volume = 0.3;

    const autoplayAttempt =
      siteAudio.play();

    if (autoplayAttempt) {

      autoplayAttempt
        .then(() => {

          musicStarted = true;
          updateMusicControl();

        })
        .catch(() => {

          updateMusicControl();

        });
    }
  }


  /*
   * ========================================
   * CONTACT ME
   * ========================================
   */

  if (toggleBtn && contactWrapper) {

    toggleBtn.addEventListener(
      'click',
      () => {

        /*
         * Start music from the user's click
         * if autoplay was blocked.
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

              updateMusicControl();

            });
        }


        /*
         * Open the contact form.
         */

        contactWrapper.classList.add('open');


        /*
         * Remove the Contact Me button
         * completely.
         */

        toggleBtn.remove();


        /*
         * Put the cursor in the name field
         * after the form has opened.
         */

        setTimeout(() => {

          if (nameField) {
            nameField.focus();
          }

        }, 500);

      }
    );
  }


  /*
   * ========================================
   * MUSIC PLAY / PAUSE
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
     * Keep music control synchronized.
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
   * INITIAL STATE
   * ========================================
   */

  updateMusicControl();

});
