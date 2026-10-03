const eventTime = new Date('2026-10-25T10:00:00+05:30').getTime();
const envelopeIntro = document.querySelector('.envelope-intro');
const envelopeTrigger = document.querySelector('.envelope-trigger');
const envelopeVideo = document.querySelector('.envelope-video');

function revealInvitation() {
  envelopeIntro?.classList.add('envelope-finished');
  document.body.classList.remove('envelope-locked');
  window.scrollTo({ top: 0, behavior: 'auto' });
  setTimeout(() => envelopeIntro?.remove(), 950);
}

let envelopeTransitionStarted = false;
function beginInvitationTransition() {
  if (envelopeTransitionStarted) return;
  envelopeTransitionStarted = true;
  envelopeIntro?.classList.add('light-bloom');
  setTimeout(() => {
    document.body.classList.remove('envelope-locked');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, 1050);
  setTimeout(() => envelopeIntro?.classList.add('envelope-finished'), 1320);
  setTimeout(() => envelopeIntro?.remove(), 2200);
}

envelopeTrigger?.addEventListener('click', async () => {
  if (envelopeIntro?.classList.contains('is-opening')) return;
  envelopeIntro?.classList.add('is-opening');
  try {
    envelopeVideo.currentTime = 0;
    await envelopeVideo.play();
  } catch {
    envelopeVideo.muted = true;
    await envelopeVideo.play().catch(revealInvitation);
  }
});
envelopeVideo?.addEventListener('ended', beginInvitationTransition, { once: true });
envelopeVideo?.addEventListener('error', revealInvitation, { once: true });

const countdownNodes = [...document.querySelectorAll('[data-countdown] strong')];
function updateCountdown() {
  const remaining = Math.max(0, eventTime - Date.now());
  const values = [
    Math.floor(remaining / 86400000),
    Math.floor((remaining % 86400000) / 3600000),
    Math.floor((remaining % 3600000) / 60000),
    Math.floor((remaining % 60000) / 1000),
  ];
  countdownNodes.forEach((node, index) => { node.textContent = String(values[index]).padStart(2, '0'); });
}
updateCountdown();
setInterval(updateCountdown, 1000);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible'));
}, { threshold: 0.12 });
document.querySelectorAll('section:not(:first-child), footer').forEach((element) => {
  element.classList.add('reveal-on-scroll');
  observer.observe(element);
});

const form = document.querySelector('.rsvp-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  localStorage.setItem('ekta-shashank-rsvp', JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
  const feedback = form.querySelector('.rsvp-feedback');
  feedback.textContent = `Thank you, ${data.guestName}. Your response is saved on this device—please also confirm it with the family.`;
  feedback.className = 'rsvp-feedback success';
});

const note = document.querySelector('.recovered-note');
setTimeout(() => { if (note) note.hidden = true; }, 9000);
