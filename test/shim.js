// ---- DOMシム(ヘッドレステスト用) ----
const anyStub = new Proxy(function(){}, {
  get: (t, p) => (typeof p === 'string' ? anyStub : undefined),
  set: () => true,
  apply: () => anyStub,
});
const ctxStub = new Proxy({}, { get: (t,p) => {
  if (p === 'canvas') return {};
  return typeof p === 'string' ? (() => anyStub) : undefined;
}, set: () => true });
const elStub = () => ({
  addEventListener(){}, getContext(){ return ctxStub; },
  style:{}, offsetHeight:0, width:0, height:0,
  getBoundingClientRect(){ return { left:0, top:0, width:640, height:856 }; },
});
global.document = {
  getElementById: () => elStub(),
  createElement: () => elStub(),
  body: Object.assign(elStub(), { classList: { add(){}, remove(){}, toggle(){} } }),
};
global.window = {
  addEventListener(){}, innerWidth: 800, innerHeight: 600,
};
global.getComputedStyle = () => ({ display: 'none' });
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => {};
global.Path2D = class { rect() {} moveTo() {} lineTo() {} closePath() {} };
