export const unregisterEvent = (
  target: HTMLElement | typeof window | null,
  event: string,
  fn: EventListenerOrEventListenerObject,
) => (target ? event.split(' ').forEach((ev) => target.removeEventListener(ev, fn)) : null);

export const registerEvent = (
  target: HTMLElement | typeof window | null,
  event: string,
  fn: EventListenerOrEventListenerObject,
) => {
  if (target) {
    event.split(' ').forEach((ev) => target.addEventListener(ev, fn, { passive: false }));

    return () => unregisterEvent(target, event, fn);
  }

  return () => {};
};
