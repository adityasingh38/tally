(function () {
  const mascots = [...document.querySelectorAll('.mascot')];
  if (!mascots.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let point = null;
  let frame = 0;

  function drawEyes() {
    frame = 0;
    mascots.forEach(mascot => {
      const rect = mascot.getBoundingClientRect();
      const dx = point ? point.x - (rect.left + rect.width / 2) : 0;
      const dy = point ? point.y - (rect.top + rect.height * 0.58) : 0;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / 240);
      const x = reducedMotion.matches ? 0 : dx / distance * rect.width * 0.035 * reach;
      const y = reducedMotion.matches ? 0 : dy / distance * rect.width * 0.025 * reach;
      mascot.querySelectorAll('.mascot-pupil').forEach(pupil => {
        pupil.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px))`;
      });
    });
  }

  function scheduleEyes() {
    if (!frame) frame = requestAnimationFrame(drawEyes);
  }

  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    point = { x: event.clientX, y: event.clientY };
    scheduleEyes();
  }, { passive: true });
  window.addEventListener('scroll', scheduleEyes, { passive: true });
  window.addEventListener('resize', scheduleEyes);
  reducedMotion.addEventListener('change', scheduleEyes);
  drawEyes();
})();
