/* eslint-disable no-multi-assign */
const EventBus = () => {
  const eventMap: Record<string, Function[]> = {};

  const off = (eventName: string, cb: Function) => {
    const fns = (eventMap[eventName] = eventMap[eventName] || []);

    // eslint-disable-next-line no-bitwise
    return fns.splice(fns.indexOf(cb) >>> 0, 1);
  };

  const on = (eventName: string, cb: Function) => {
    const fns = (eventMap[eventName] = eventMap[eventName] || []);

    fns.push(cb);

    return off.bind(null, eventName, cb);
  };

  const emit = (event: string, ...args: any) => {
    const fns = eventMap[event];

    if (!fns || !fns.length) return [];

    return fns.map((fn) => fn(...args));
  };

  return { on, off, emit };
};

export default EventBus;
