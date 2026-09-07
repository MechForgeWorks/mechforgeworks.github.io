(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = form.querySelector('.status');
  var button = form.querySelector('button[type="submit"]');

  function setStatus(text, state) {
    status.textContent = text;
    if (state) {
      status.setAttribute('data-state', state);
    } else {
      status.removeAttribute('data-state');
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    button.disabled = true;
    setStatus('Sending…');

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        if (response.ok) {
          form.reset();
          setStatus('Thanks — message sent.', 'ok');
        } else {
          setStatus('That didn’t send. Try LinkedIn instead.', 'err');
        }
      })
      .catch(function () {
        setStatus('That didn’t send. Try LinkedIn instead.', 'err');
      })
      .then(function () {
        button.disabled = false;
      });
  });
})();
