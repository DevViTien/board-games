// Fails when a change has every task ticked but is still not archived. Until it is archived,
// openspec/specs/ does not describe behaviour that has already shipped, and the next change is
// reviewed against an incomplete source of truth.
//
// Usage: openspec list --json | node scripts/openspec-archive-gate.mjs
import { text } from "node:stream/consumers";

const { changes = [] } = JSON.parse(await text(process.stdin));
const unarchived = changes.filter(
  (change) => change.totalTasks > 0 && change.completedTasks === change.totalTasks,
);

if (unarchived.length > 0) {
  for (const change of unarchived) {
    console.error(
      `✗ ${change.name}: all ${change.totalTasks} tasks are done but the change is not archived.` +
        ` Run: pnpm exec openspec archive ${change.name} --yes`,
    );
  }
  process.exit(1);
}

console.log(`✓ No finished change left unarchived (${changes.length} active).`);
