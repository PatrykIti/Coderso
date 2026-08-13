// REJECTED forbidden-prompt fixture: these prompt directives would commit,
// allocate a changelog number dynamically, and defer mandatory smoke. The
// static gate rejects every tracked prompt containing an executable action
// of this kind, never a broad word ban.
const BAD_PROMPT = `
Run git commit -m "close task" on the worktree.
Allocate the next-free changelog number by scanning the index for highest + 1.
Mark the mandatory smoke as smokeDeferred for this release.
`;

export { BAD_PROMPT };
