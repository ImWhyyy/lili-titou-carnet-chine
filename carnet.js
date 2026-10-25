const journey = document.querySelector('.journey');
const routeSvg = journey.querySelector('.journey-route');
const line = routeSvg.querySelector('.route-dots');
const wash = routeSvg.querySelector('.route-wash');
const progress = routeSvg.querySelector('.route-progress');
const traveler = routeSvg.querySelector('.route-traveler');
let routeLength = 0;
let scheduled = false;

function paintProgress() {
  scheduled = false;
  if (!routeLength) return;
  const box = journey.getBoundingClientRect();
  const fraction = Math.max(0, Math.min(1, (innerHeight * 0.55 - box.top) / box.height));
  progress.style.strokeDasharray = `${routeLength * fraction} ${routeLength}`;
  const point = line.getPointAtLength(routeLength * fraction);
  traveler.setAttribute('cx', point.x);
  traveler.setAttribute('cy', point.y);
}

function layRoute() {
  const box = journey.getBoundingClientRect();
  const stops = [...journey.querySelectorAll('.route-stop')].map(element => {
    const r = element.getBoundingClientRect();
    return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
  });
  if (!stops.length || box.width < 1) return;
  const mobile = box.width < 700;
  const points = [[stops[0][0], 0], ...stops, [stops.at(-1)[0], box.height]];
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dy = b[1] - a[1];
    const turn = mobile ? (i % 2 ? 8 : -8) : (i % 2 ? 72 : -72);
    d += ` C ${a[0] + turn} ${a[1] + dy * 0.38}, ${b[0] + turn} ${b[1] - dy * 0.38}, ${b[0]} ${b[1]}`;
  }
  routeSvg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  [line, wash, progress].forEach(path => path.setAttribute('d', d));
  routeLength = line.getTotalLength();
  paintProgress();
}

new ResizeObserver(layRoute).observe(journey);
window.addEventListener('load', layRoute);
document.fonts.ready.then(layRoute);
window.addEventListener('scroll', () => {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(paintProgress);
  }
}, { passive: true });
document.querySelectorAll('details').forEach(element => element.addEventListener('toggle', layRoute));
document.querySelectorAll('[data-video-id]').forEach(button => {
  button.addEventListener('click', () => {
    const id = button.dataset.videoId;
    if (!/^[\w-]{11}$/.test(id)) return;
    const frame = document.createElement('iframe');
    const start = Number(button.dataset.videoStart) || 0;
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&autoplay=1&start=${start}`;
    frame.title = button.dataset.videoTitle;
    frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.tabIndex = 0;
    button.replaceWith(frame);
    frame.focus();
  });
});
window.addEventListener('message', event => {
  const frame = document.getElementById('map-frame');
  if (event.source === frame.contentWindow && event.origin === location.origin && event.data?.type === 'travel-map-height') {
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height > 200 && height < 2500) frame.style.height = `${height + 12}px`;
  }
});
