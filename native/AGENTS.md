# Native PhotoSweep work

The user explicitly requested lower credit consumption and faster verified progress. Before native work, read `WORKFLOW.md` and `work-state.json`, then inspect only the affected sources.

- Follow the single critical path in `work-state.json`; batch coherent patches and avoid unrelated polish while delivery is blocked.
- Use `python tools/native_harness.py check/plan/status/failure` from the repository root. Cached local checks are not native build/device evidence.
- Documentation/marketing-only edits must not cause full native CI. Full native regression is required on the distribution revision.
- Prefer compact diagnostics; never download a full xcresult just to inspect one screen when screenshot artifacts suffice.
- No extra agents unless the user explicitly asks. Do not publish placeholders or mark unexecuted tests as passed.
