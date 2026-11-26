import '@testing-library/jest-dom'

// App tests call localStorage.clear() in beforeEach. The first-visit intro would
// then cover the app, so mark it as seen after every clear. Tests of the intro
// itself remove the key with removeItem.
const originalClear = Storage.prototype.clear
Storage.prototype.clear = function clear(this: Storage) {
  originalClear.call(this)
  this.setItem('hcj_seen_intro', 'true')
}
