const journey = document.querySelector('.journey');
const routeSvg = journey.querySelector('.journey-route');
const line = routeSvg.querySelector('.route-dots');
const wash = routeSvg.querySelector('.route-wash');
const progress = routeSvg.querySelector('.route-progress');
const traveler = routeSvg.querySelector('.route-traveler');
let routeLength = 0;
let routeRegions = [];
let scheduled = false;

function paintProgress() {
  scheduled = false;
  if (!routeLength) return;
  const box = journey.getBoundingClientRect();
  const readingY = innerHeight * 0.55 - box.top;
  let distance = 0;
  let insideDay = false;
  for (const region of routeRegions) {
    if (readingY >= region.bottom) distance = region.end;
    else if (readingY >= region.top) {
      const fraction = (readingY - region.top) / (region.bottom - region.top);
      distance = region.start + fraction * (region.end - region.start);
      insideDay = true;
      break;
    } else break;
  }
  for (const region of routeRegions) {
    const length = region.end - region.start;
    const visible = Math.max(0, Math.min(length, distance - region.start));
    region.path.style.strokeDasharray = `${visible} ${length}`;
    region.path.style.visibility = visible > 0 ? 'visible' : 'hidden';
  }
  traveler.style.visibility = insideDay ? 'visible' : 'hidden';
  const point = line.getPointAtLength(distance);
  traveler.setAttribute('cx', point.x);
  traveler.setAttribute('cy', point.y);
}

function routeGroupPath(stops, top, bottom, mobile) {
  const points = [[stops[0][0], top], ...stops, [stops.at(-1)[0], bottom]];
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dy = b[1] - a[1];
    const turn = (mobile ? 6 : 18) * (i % 2 ? 1 : -1);
    d += ` C ${a[0] + turn} ${a[1] + dy * 0.38}, ${b[0] + turn} ${b[1] - dy * 0.38}, ${b[0]} ${b[1]}`;
  }
  return d;
}

function layRoute() {
  const box = journey.getBoundingClientRect();
  if (box.width < 1) return;
  const mobile = matchMedia('(max-width:900px)').matches;
  routeRegions = [];
  progress.replaceChildren();
  let d = '';
  let previousLength = 0;
  for (const group of journey.querySelectorAll('.day-run')) {
    const stops = [...group.querySelectorAll('.route-stop')].map(element => {
      const r = element.getBoundingClientRect();
      return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
    });
    if (!stops.length) continue;
    const region = group.getBoundingClientRect();
    const top = region.top - box.top;
    const bottom = region.bottom - box.top;
    const segment = routeGroupPath(stops, top, bottom, mobile);
    d += ` ${segment}`;
    line.setAttribute('d', d);
    const end = line.getTotalLength();
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', segment);
    progress.append(path);
    routeRegions.push({top, bottom, start: previousLength, end, path});
    previousLength = end;
  }
  routeSvg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  [line, wash].forEach(path => path.setAttribute('d', d));
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
