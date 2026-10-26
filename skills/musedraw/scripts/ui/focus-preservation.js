/* Classic script for synchronous child replacement in a stable region.
 * Identity: unique data-focus-key, otherwise unique id. Supply a useful fallback
 * when the focused control can disappear. Frameworks should prefer stable nodes.
 */
(function (global) {
  'use strict';

  function capture(region) {
    var active = region.ownerDocument.activeElement;
    if (!active || !region.contains(active)) return null;
    var attribute = active.hasAttribute('data-focus-key') ? 'data-focus-key' : 'id';
    return {
      region: region,
      element: active,
      attribute: attribute,
      key: active.getAttribute(attribute)
    };
  }

  function usable(element, region) {
    return !!(element && element.isConnected && region.contains(element) &&
      typeof element.focus === 'function' &&
      !element.matches(':disabled, [aria-disabled="true"]') &&
      !element.closest('[hidden], [inert]') &&
      element.matches('a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, object, embed, [tabindex], [contenteditable]:not([contenteditable="false"])') &&
      element.getClientRects().length &&
      global.getComputedStyle(element).visibility === 'visible');
  }

  function restore(region, snapshot, options) {
    if (!snapshot || snapshot.region !== region || !region.isConnected) return false;
    var doc = region.ownerDocument;
    var active = doc.activeElement;
    // Preserve a new intentional focus destination, including one outside region.
    if (active !== snapshot.element && active !== doc.body && active !== doc.documentElement) return false;

    var target = usable(snapshot.element, region) ? snapshot.element : null;
    if (!target && snapshot.key !== null) {
      var candidates = Array.prototype.filter.call(
        region.querySelectorAll('[' + snapshot.attribute + ']'),
        function (element) { return element.getAttribute(snapshot.attribute) === snapshot.key; }
      );
      // Duplicate identities are ambiguous; let the caller choose a successor.
      if (candidates.length === 1 && usable(candidates[0], region)) target = candidates[0];
    }
    if (!target && options && typeof options.fallback === 'function') target = options.fallback();
    if (!usable(target, region)) return false;
    if (doc.activeElement !== target) target.focus({ preventScroll: true });
    return doc.activeElement === target;
  }

  function update(region, render, options) {
    var snapshot = capture(region);
    render();
    return restore(region, snapshot, options);
  }

  global.FocusPreservation = Object.freeze({ capture: capture, restore: restore, update: update });
})(window);
