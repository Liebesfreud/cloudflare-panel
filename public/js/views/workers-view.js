import { renderShell } from "./shell-view.js";
import { renderWorkersNotice } from "./workers/helpers.js";
import {
  renderWorkersListPanel,
  renderWorkersSummary,
  renderWorkersToolbar,
} from "./workers/list-view.js";
import {
  renderCreateWorkerModal,
  renderDeleteWorkerModal,
  renderEditWorkerModal,
} from "./workers/modals-view.js";

export function renderWorkersView() {
  renderShell(`
    <section class="content workers-content">
      <div class="workers-scroll-shell">
        ${renderWorkersNotice()}
        ${renderWorkersToolbar()}
        ${renderWorkersSummary()}
        ${renderWorkersListPanel()}
      </div>
    </section>
    ${renderCreateWorkerModal()}
    ${renderEditWorkerModal()}
    ${renderDeleteWorkerModal()}
  `);
}
