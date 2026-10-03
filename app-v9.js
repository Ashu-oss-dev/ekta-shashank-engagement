const eventTime = new Date('2026-10-25T10:00:00+05:30').getTime();
const envelopeIntro = document.querySelector('.envelope-intro');
const envelopeTrigger = document.querySelector('.envelope-trigger');
const envelopeVideo = document.querySelector('.envelope-video');
const invitationMusic = document.querySelector('#invitation-music');
let invitationMusicStarted = false;

function softlyStartInvitationMusic() {
  if (!invitationMusic || invitationMusicStarted) return;
  invitationMusicStarted = true;
  invitationMusic.currentTime = 0;
  invitationMusic.muted = false;
  invitationMusic.volume = 0;
  invitationMusic.play().then(() => {
    const targetVolume = 0.18;
    const fadeStep = targetVolume / 30;
    const fade = setInterval(() => {
      invitationMusic.volume = Math.min(targetVolume, invitationMusic.volume + fadeStep);
      if (invitationMusic.volume >= targetVolume) clearInterval(fade);
    }, 100);
  }).catch(() => {});
}

function revealInvitation() {
  softlyStartInvitationMusic();
  document.body.classList.remove('envelope-locked');
  window.scrollTo({ top: 0, behavior: 'auto' });
  envelopeIntro?.classList.add('envelope-finished');
  setTimeout(() => envelopeIntro?.remove(), 500);
  setTimeout(startAutoScroll, 1200);
}

let envelopeTransitionStarted = false;
function beginInvitationTransition() {
  if (envelopeTransitionStarted) return;
  envelopeTransitionStarted = true;
  envelopeIntro?.classList.add('light-reveal');
  setTimeout(revealInvitation, 720);
}

envelopeTrigger?.addEventListener('click', async () => {
  if (envelopeIntro?.classList.contains('is-opening')) return;
  envelopeIntro?.classList.add('is-opening');
  if (invitationMusic) {
    invitationMusic.muted = true;
    invitationMusic.volume = 0;
    invitationMusic.currentTime = 0;
    invitationMusic.play().catch(() => {});
  }
  try {
    envelopeVideo.muted = true;
    envelopeVideo.volume = 0;
    envelopeVideo.currentTime = 0;
    await envelopeVideo.play();
  } catch {
    envelopeVideo.muted = true;
    await envelopeVideo.play().catch(revealInvitation);
  }
});
envelopeVideo?.addEventListener('timeupdate', () => {
  if (envelopeVideo.currentTime >= 4.45) beginInvitationTransition();
});
envelopeVideo?.addEventListener('ended', beginInvitationTransition, { once: true });
envelopeVideo?.addEventListener('error', revealInvitation, { once: true });

const celebrationScene = document.querySelector('.celebration-scene');
const celebrationFrame = document.querySelector('.celebration-frame');
const storyVideo = document.querySelector('.peek-video');
const celebrationPhases = ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5'];
let currentCelebrationPhase = -1;
let celebrationFramePending = false;
let storyStartTimer;
let storyFrameExpanded = false;
let storyCompleted = false;

if (storyVideo) {
  storyVideo.loop = false;
  storyVideo.removeAttribute('loop');
}

function playStoryOnce() {
  if (!storyVideo || storyCompleted || storyVideo.ended) return;
  storyVideo.play().catch(() => {});
}

function playStorySegmentForPhase(phase) {
  if (!storyVideo) return;
  clearTimeout(storyStartTimer);

  // The story is a one-time sequence. Keep its final frame visible after it ends,
  // even if later scroll-phase updates run.
  if (storyCompleted) return;

  if (phase < 2) {
    storyFrameExpanded = false;
    storyVideo.pause();
    storyVideo.playbackRate = 1;
    storyVideo.currentTime = 0;
    celebrationFrame?.classList.remove('forward-started');
    return;
  }

  if (phase === 2) {
    storyFrameExpanded = false;
    storyVideo.pause();
    storyVideo.playbackRate = 1;
    storyVideo.currentTime = 0;
    celebrationFrame?.classList.remove('forward-started');
    storyStartTimer = setTimeout(() => {
      if (currentCelebrationPhase === 2) playStoryOnce();
    }, 1400);
    return;
  }

  playStoryOnce();
}

function completeStoryAndJump() {
  if (storyCompleted) return;
  storyCompleted = true;
  clearTimeout(storyStartTimer);
  storyVideo.pause();
  if (Number.isFinite(storyVideo.duration)) {
    storyVideo.currentTime = Math.max(0, storyVideo.duration - (1 / 30));
  }
  // Skip every remaining sticky-scroll pixel and jump straight to Section 3.
  const countdownSection = document.querySelector('.countdown-section');
  if (countdownSection) {
    const target = countdownSection.offsetTop;
    const forceJump = () => {
      scrollingElement.scrollTop = target;
      document.documentElement.scrollTop = target;
      document.body.scrollTop = target;
    };
    forceJump();
    requestAnimationFrame(forceJump);
    setTimeout(forceJump, 80);
    autoScrollTarget = window.scrollY;
    autoScrollLastTime = performance.now();
  }
}

storyVideo?.addEventListener('ended', completeStoryAndJump);

storyVideo?.addEventListener('play', () => {
  if (storyCompleted) storyVideo.pause();
});

storyVideo?.addEventListener('timeupdate', () => {
  if (currentCelebrationPhase >= 2 && !storyFrameExpanded && storyVideo.currentTime >= 4.52) {
    storyFrameExpanded = true;
    celebrationFrame?.classList.add('forward-started');
  }
  // Some mobile browsers hold on the last decoded frame without dispatching
  // `ended`. Treat the final fraction of a second as completion as well.
  if (!storyCompleted && Number.isFinite(storyVideo.duration) &&
      storyVideo.duration > 0 && storyVideo.currentTime >= storyVideo.duration - .65) {
    completeStoryAndJump();
  }
});

/*
 * Gentle invitation auto-scroll. It yields to every deliberate guest gesture,
 * continues from the guest's new position after release, and holds the page in
 * the engagement scene until the one-time couple animation has finished.
 */
const AUTO_SCROLL_SPEED = 125;
const SECOND_SECTION_SCROLL_MULTIPLIER = 1.9;
const SECTION_PAUSE_DURATION = 2000;
const scrollingElement = document.scrollingElement || document.documentElement;
const autoScrollSections = [...document.querySelectorAll('.invitation-content > section, .invitation-content > footer')];
const pausedAutoScrollSections = new WeakSet();
let autoScrollStarted = false;
let autoScrollFrame = 0;
let autoScrollLastTime = 0;
let autoScrollTarget = 0;
let currentAutoScrollSection = null;
let sectionPauseUntil = 0;
let guestIsInteracting = false;
let formControlFocused = false;
let interactionResumeTimer = 0;

function engagementMovieIsHoldingScroll() {
  return currentCelebrationPhase >= 2 && !storyCompleted;
}

function pauseForGuestInteraction(resumeDelay) {
  guestIsInteracting = true;
  autoScrollTarget = window.scrollY;
  window.clearTimeout(interactionResumeTimer);
  if (Number.isFinite(resumeDelay)) {
    interactionResumeTimer = window.setTimeout(() => {
      guestIsInteracting = false;
      autoScrollTarget = window.scrollY;
      autoScrollLastTime = performance.now();
    }, resumeDelay);
  }
}

function resumeAfterGuestInteraction(delay = 500) {
  pauseForGuestInteraction(delay);
}

function updateSectionPause(time) {
  if (guestIsInteracting || formControlFocused || document.hidden) return;
  // Pause only when the lower edge of a section is about to leave the screen,
  // so guests see the content first and the stop feels like a natural ending.
  const activeSection = autoScrollSections.find((section) => {
    const rect = section.getBoundingClientRect();
    return rect.bottom <= window.innerHeight * 1.08 &&
      rect.bottom > window.innerHeight * 0.62;
  });
  const pauseTarget = activeSection;
  if (!pauseTarget || pauseTarget === currentAutoScrollSection) return;

  currentAutoScrollSection = pauseTarget;
  if (pausedAutoScrollSections.has(pauseTarget)) return;
  pausedAutoScrollSections.add(pauseTarget);
  sectionPauseUntil = time + SECTION_PAUSE_DURATION;
  autoScrollTarget = window.scrollY;
}

function autoScrollStep(time) {
  if (!autoScrollStarted) return;
  if (!autoScrollLastTime) autoScrollLastTime = time;
  const elapsed = Math.min(64, time - autoScrollLastTime);
  autoScrollLastTime = time;

  const pageBottom = Math.max(
    scrollingElement.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  ) - window.innerHeight;
  updateSectionPause(time);
  const canAdvance = !guestIsInteracting && !formControlFocused && !document.hidden &&
    time >= sectionPauseUntil && !engagementMovieIsHoldingScroll() && window.scrollY < pageBottom - 1;

  if (canAdvance) {
    const sceneRect = celebrationScene?.getBoundingClientRect();
    const secondSectionIsActive = sceneRect && sceneRect.top <= 0 && sceneRect.bottom > window.innerHeight;
    const activeSpeed = secondSectionIsActive && !storyCompleted
      ? AUTO_SCROLL_SPEED * SECOND_SECTION_SCROLL_MULTIPLIER
      : AUTO_SCROLL_SPEED;
    // Keep a fractional target instead of rounding every frame. This removes
    // the tiny stop/start judder that is especially visible on phone screens.
    if (Math.abs(autoScrollTarget - window.scrollY) > 3) autoScrollTarget = window.scrollY;
    autoScrollTarget = Math.min(pageBottom, autoScrollTarget + activeSpeed * (elapsed / 1000));
    window.scrollTo(0, autoScrollTarget);
  } else {
    autoScrollTarget = window.scrollY;
  }

  autoScrollFrame = requestAnimationFrame(autoScrollStep);
}

function startAutoScroll() {
  if (autoScrollStarted) return;
  window.clearTimeout(interactionResumeTimer);
  guestIsInteracting = false;
  autoScrollStarted = true;
  autoScrollTarget = window.scrollY;
  autoScrollLastTime = performance.now();
  document.documentElement.classList.add('auto-scroll-active');
  autoScrollFrame = requestAnimationFrame(autoScrollStep);
}

// The timeout is a safety net for iOS/WebViews that occasionally omit the
// matching touchend/pointerup event after a swipe or browser chrome gesture.
window.addEventListener('touchstart', () => pauseForGuestInteraction(8000), { passive: true });
window.addEventListener('touchmove', () => pauseForGuestInteraction(1400), { passive: true });
window.addEventListener('touchend', () => resumeAfterGuestInteraction(350), { passive: true });
window.addEventListener('touchcancel', () => resumeAfterGuestInteraction(350), { passive: true });
window.addEventListener('pointerdown', () => pauseForGuestInteraction(8000), { passive: true });
window.addEventListener('pointerup', () => resumeAfterGuestInteraction(350), { passive: true });
window.addEventListener('pointercancel', () => resumeAfterGuestInteraction(350), { passive: true });
window.addEventListener('wheel', () => resumeAfterGuestInteraction(700), { passive: true });
window.addEventListener('keydown', (event) => {
  if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) {
    resumeAfterGuestInteraction(800);
  }
});
document.addEventListener('focusin', (event) => {
  if (event.target.closest('input, textarea, select')) formControlFocused = true;
});
document.addEventListener('focusout', (event) => {
  if (event.target.closest('input, textarea, select')) {
    formControlFocused = false;
    autoScrollLastTime = performance.now();
  }
});
document.addEventListener('visibilitychange', () => {
  autoScrollLastTime = performance.now();
  autoScrollTarget = window.scrollY;
});
window.addEventListener('pageshow', () => {
  window.clearTimeout(interactionResumeTimer);
  guestIsInteracting = false;
  autoScrollTarget = window.scrollY;
  autoScrollLastTime = performance.now();
});

function updateCelebrationPhase() {
  celebrationFramePending = false;
  if (!celebrationScene || !celebrationFrame) return;

  const sceneRect = celebrationScene.getBoundingClientRect();
  const scrollableDistance = Math.max(1, celebrationScene.offsetHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -sceneRect.top / scrollableDistance));
  // Two-stage scroll story: reveal the large announcement, then compact it and
  // start the movie. The movie itself advances without another scroll phase.
  const phase = progress < .12 ? 0 : progress < .52 ? 1 : 2;

  if (phase === currentCelebrationPhase) return;
  currentCelebrationPhase = phase;
  celebrationFrame.classList.remove(...celebrationPhases);
  celebrationFrame.classList.add(`phase-${phase}`);
  celebrationFrame.classList.toggle('forward-started', storyFrameExpanded);
  playStorySegmentForPhase(phase);
}

function requestCelebrationUpdate() {
  if (celebrationFramePending) return;
  celebrationFramePending = true;
  requestAnimationFrame(updateCelebrationPhase);
}

window.addEventListener('scroll', requestCelebrationUpdate, { passive: true });
window.addEventListener('resize', requestCelebrationUpdate);
requestCelebrationUpdate();

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
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });
document.querySelectorAll('section:not(:first-child), footer').forEach((element) => {
  element.classList.add('reveal-on-scroll');
  observer.observe(element);
});

const form = document.querySelector('.rsvp-form');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  localStorage.setItem('ekta-shashank-rsvp', JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
  const feedback = form.querySelector('.rsvp-feedback');
  const button = form.querySelector('.rsvp-submit');
  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.textContent = 'Sending RSVP…';
  feedback.textContent = '';
  feedback.className = 'rsvp-feedback idle';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' }
    });
    const result = await response.json().catch(() => ({}));
    const sent = response.ok && (result.success === true || result.success === 'true');
    if (!sent) throw new Error(result.message || 'RSVP could not be emailed');
    feedback.textContent = `Thank you, ${data['Guest name']}. Your RSVP has been emailed to Ashwin.`;
    feedback.className = 'rsvp-feedback success';
    form.reset();
  } catch (error) {
    const activationNeeded = /activat/i.test(String(error.message));
    feedback.textContent = activationNeeded
      ? 'Your RSVP is saved on this device. Email delivery needs one-time activation by the family.'
      : 'We could not email your RSVP right now. Please try again or contact the family directly.';
    feedback.className = 'rsvp-feedback error';
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
});

const note = document.querySelector('.recovered-note');
setTimeout(() => { if (note) note.hidden = true; }, 9000);
