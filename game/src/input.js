// EMBER WING — keyboard + mouse input.
// One job: turn raw DOM events into one clean action object per frame,
// with edge-triggered presses (drop, start, pause, restart) consumed
// exactly once by world.update, never by the render loop.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseDrop = false;
  let mouseClick = false;

  function codeOf(e) {
    return e.code;
  }

  function onKeyDown(e) {
    const c = codeOf(e);
    if (
      c === 'ArrowUp' ||
      c === 'ArrowDown' ||
      c === 'ArrowLeft' ||
      c === 'ArrowRight' ||
      c === 'Space'
    ) {
      e.preventDefault();
    }
    if (!keys.has(c)) pressed.add(c);
    keys.add(c);
  }

  function onKeyUp(e) {
    keys.delete(codeOf(e));
  }

  function onMouseDown(e) {
    e.preventDefault();
    mouseClick = true;
    mouseDrop = true;
  }

  function onBlur() {
    keys.clear();
    pressed.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);

  function held(code) {
    return keys.has(code);
  }

  // Snapshot for this frame; edge presses are cleared here so a press
  // is never seen twice, even on a slow display.
  function poll() {
    const actions = {
      left: held('ArrowLeft') || held('KeyA'),
      right: held('ArrowRight') || held('KeyD'),
      up: held('ArrowUp'),
      down: held('ArrowDown'),
      throttleUp: held('KeyW'),
      throttleDown: held('KeyS'),
      drop: pressed.has('Space') || mouseDrop,
      start: pressed.has('Enter') || pressed.has('Space') || mouseClick,
      pause: pressed.has('KeyP') || pressed.has('Escape'),
      restart: pressed.has('KeyR') || pressed.has('Enter') || mouseClick,
      mute: pressed.has('KeyM'),
    };
    pressed.clear();
    mouseDrop = false;
    mouseClick = false;
    return actions;
  }

  return { poll };
}
