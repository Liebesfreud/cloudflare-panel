import { state } from "../state.js";

export function createNoticeActions({ renderApp }) {
  function showNotice(message) {
    state.notice = message;
    renderApp();
    window.setTimeout(() => {
      if (state.notice === message) {
        state.notice = "";
        renderApp();
      }
    }, 1800);
  }

  return { showNotice };
}
